const OPTIMIZATION_CONFIG = {
  doseMg: 50,
  doseIntervalDays: 15,
  patientWeightKg: 70,
  biologicalSex: "afab",
  simulationOutputStepDays: 1,

  measuredHistory: [
    { peak: 275, trough: 196 },
    { peak: 464, trough: 332 },
    { peak: 596, trough: 423 },
    { peak: 683, trough: 488 },
    { peak: 746, trough: 529 },
    { peak: 786, trough: 561 },
    { peak: 817, trough: 579 },
    { peak: 834, trough: 595 },
    { peak: 850, trough: 602 },
    { peak: 857, trough: 611 },
    { peak: 866, trough: 613 },
    { peak: 867, trough: 618 },
    { peak: 873, trough: 618 },
    { peak: 873, trough: 618 },
  ],
};

const SOLVER_RUNTIME_MS = 60000;
const ITERATIONS_PER_STEP = 500;
const HISTORY_PEAK_OFFSET = 20;
const STEADY_STATE_DOSE_INDEX = 13;

function buildDoseSchedule(totalDays, doseMg, intervalDays) {
  const doseEvents = [];
  for (let day = 0; day < totalDays; day += intervalDays) {
    doseEvents.push({ time: day, dose: doseMg });
  }
  return doseEvents;
}

function simulateConcentrationCurve(
  absorptionRate,
  eliminationRate,
  scaleFactor,
  config,
) {
  const totalWeeks = config.measuredHistory.length;
  const totalDays = totalWeeks * config.doseIntervalDays;
  const doseEvents = buildDoseSchedule(
    totalDays,
    config.doseMg,
    config.doseIntervalDays,
  );

  const sampleCount =
    Math.floor(totalDays / config.simulationOutputStepDays) + 1;
  const concentrationLevels = new Array(sampleCount).fill(0);
  const weightFactor = 70 / config.patientWeightKg;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
    const currentTime = sampleIndex * config.simulationOutputStepDays;
    let totalConcentration = 0;

    doseEvents.forEach((event) => {
      const timeSinceDose = currentTime - event.time;
      if (timeSinceDose > 0 && timeSinceDose < 150) {
        const timeToPeak =
          Math.log(absorptionRate / eliminationRate) /
          (absorptionRate - eliminationRate);
        const maxConcentration =
          Math.exp(-eliminationRate * timeToPeak) -
          Math.exp(-absorptionRate * timeToPeak);
        let contribution =
          (Math.exp(-eliminationRate * timeSinceDose) -
            Math.exp(-absorptionRate * timeSinceDose)) /
          maxConcentration;
        contribution = contribution * event.dose * scaleFactor;
        totalConcentration += contribution * weightFactor;
      }
    });

    concentrationLevels[sampleIndex] = totalConcentration;
  }

  return extractWeeklyPeaksAndTroughs(
    concentrationLevels,
    totalWeeks,
    config.doseIntervalDays,
  );
}

function extractWeeklyPeaksAndTroughs(levels, totalWeeks, intervalDays) {
  const results = [];
  for (let week = 0; week < totalWeeks; week++) {
    const startIndex = week * intervalDays;
    const endIndex = (week + 1) * intervalDays;
    const weekLevels = levels.slice(startIndex, endIndex);
    results.push({ peak: Math.max(...weekLevels), trough: levels[endIndex] });
  }
  return results;
}

function calculateSimulationError(
  absorptionRate,
  eliminationRate,
  scaleFactor,
) {
  if (
    absorptionRate <= eliminationRate ||
    absorptionRate <= 0 ||
    eliminationRate <= 0 ||
    scaleFactor <= 0
  ) {
    return Infinity;
  }

  const simulatedResults = simulateConcentrationCurve(
    absorptionRate,
    eliminationRate,
    scaleFactor,
    OPTIMIZATION_CONFIG,
  );
  const { measuredHistory } = OPTIMIZATION_CONFIG;

  let totalError = 0;
  for (let i = 1; i < measuredHistory.length; i++) {
    const realPeakDelta = measuredHistory[i].peak - measuredHistory[0].peak;
    const simulatedPeakDelta =
      simulatedResults[i].peak - simulatedResults[0].peak;

    const realTroughDelta =
      measuredHistory[i].trough - measuredHistory[0].trough;
    const simulatedTroughDelta =
      simulatedResults[i].trough - simulatedResults[0].trough;

    totalError += Math.pow(simulatedPeakDelta - realPeakDelta, 2);
    totalError += Math.pow(simulatedTroughDelta - realTroughDelta, 2);
  }

  return totalError;
}

function generateRandomParameter(center, radius) {
  return center + (Math.random() - 0.5) * radius;
}

function calculateSearchRadius(progressFraction) {
  let radius = 2.0 * (1.0 - progressFraction);
  return radius < 0.001 ? 0.001 : radius;
}

function buildProgressBar(filledRatio) {
  const barLength = 20;
  const filled = Math.round(barLength * Math.min(filledRatio, 1));
  return "█".repeat(filled) + "░".repeat(barLength - filled);
}

function clearAndPrintConsole(message) {
  console.clear();
  console.log(message);
}

function displayResults(
  bestAbsorptionRate,
  bestEliminationRate,
  bestScaleFactor,
) {
  console.log("\n=======================================================");
  console.log("               PARAMS SOLVER RESULTS                   ");
  console.log("=======================================================");
  console.log(`ka:    ${bestAbsorptionRate.toFixed(6)}`);
  console.log(`ke:    ${bestEliminationRate.toFixed(6)}`);
  console.log(`scale: ${bestScaleFactor.toFixed(6)}`);
  console.log("=======================================================");

  const simulatedResults = simulateConcentrationCurve(
    bestAbsorptionRate,
    bestEliminationRate,
    bestScaleFactor,
    OPTIMIZATION_CONFIG,
  );

  console.log("Comparison Table (Target vs Simulated):");
  OPTIMIZATION_CONFIG.measuredHistory.forEach((target, index) => {
    const simulatedPeak = Math.round(
      simulatedResults[index].peak + HISTORY_PEAK_OFFSET,
    );
    const simulatedTrough = Math.round(
      simulatedResults[index].trough + HISTORY_PEAK_OFFSET,
    );

    const peakDiff = simulatedPeak - target.peak;
    const troughDiff = simulatedTrough - target.trough;

    const peakStatus =
      peakDiff === 0 ? "EXACT" : `${peakDiff >= 0 ? "+" : ""}${peakDiff}`;
    const troughStatus =
      troughDiff === 0 ? "EXACT" : `${troughDiff >= 0 ? "+" : ""}${troughDiff}`;

    console.log(`Dose ${index + 1}:`);
    console.log(
      `  Peak:   ${target.peak} -> ${simulatedPeak} (Diff: ${peakStatus})`,
    );
    console.log(
      `  Trough: ${target.trough} -> ${simulatedTrough} (Diff: ${troughStatus})`,
    );
  });
  console.log("=======================================================");
}

function calibrateScaleToSteadyState(
  absorptionRate,
  eliminationRate,
  currentScale,
  targetPeak,
) {
  const simulatedResults = simulateConcentrationCurve(
    absorptionRate,
    eliminationRate,
    currentScale,
    OPTIMIZATION_CONFIG,
  );
  const steadyStatePeak = simulatedResults[STEADY_STATE_DOSE_INDEX].peak;
  return (targetPeak / steadyStatePeak) * currentScale;
}

function runMonteCarloOptimization() {
  return new Promise((resolve) => {
    const startTime = Date.now();

    let bestAbsorptionRate = 0.5;
    let bestEliminationRate = 0.1;
    let bestScaleFactor = 4.0;
    let minimumError = Infinity;
    let totalIterations = 0;

    function performOptimizationStep() {
      const elapsedMs = Date.now() - startTime;
      const progress = elapsedMs / SOLVER_RUNTIME_MS;
      const searchRadius = calculateSearchRadius(progress);

      for (let i = 0; i < ITERATIONS_PER_STEP; i++) {
        totalIterations++;

        const testAbsorption = generateRandomParameter(
          bestAbsorptionRate,
          searchRadius,
        );
        const testElimination = generateRandomParameter(
          bestEliminationRate,
          searchRadius * 0.2,
        );
        const testScale = generateRandomParameter(
          bestScaleFactor,
          searchRadius * 5,
        );

        if (
          testAbsorption <= testElimination ||
          testAbsorption <= 0 ||
          testElimination <= 0 ||
          testScale <= 0
        ) {
          continue;
        }

        const error = calculateSimulationError(
          testAbsorption,
          testElimination,
          testScale,
        );
        if (error < minimumError) {
          minimumError = error;
          bestAbsorptionRate = testAbsorption;
          bestEliminationRate = testElimination;
          bestScaleFactor = testScale;
        }
      }

      const progressBar = buildProgressBar(progress);
      clearAndPrintConsole(
        `RUNNING SOLVER [${progressBar}] ${(Math.min(progress, 1) * 100).toFixed(1)}% | Iterations: ${totalIterations} | Current Error: ${minimumError.toFixed(2)}`,
      );

      if (elapsedMs < SOLVER_RUNTIME_MS) {
        setTimeout(performOptimizationStep, 0);
      } else {
        const targetPureSteadyStatePeak =
          OPTIMIZATION_CONFIG.measuredHistory[STEADY_STATE_DOSE_INDEX].peak -
          HISTORY_PEAK_OFFSET;
        bestScaleFactor = calibrateScaleToSteadyState(
          bestAbsorptionRate,
          bestEliminationRate,
          bestScaleFactor,
          targetPureSteadyStatePeak,
        );

        resolve({
          ka: bestAbsorptionRate,
          ke: bestEliminationRate,
          scale: bestScaleFactor,
        });
      }
    }

    performOptimizationStep();
  });
}

runMonteCarloOptimization().then((result) => {
  console.clear();
  displayResults(result.ka, result.ke, result.scale);
});
