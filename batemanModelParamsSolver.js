const CONFIG = {
  dose: 50, // mg
  interval: 15, // days
  weightKg: 70,
  biologicalSex: "afab",
  outputStep: 1,

  history: [
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

function simulateConcentration(ka, ke, scale, config) {
  const totalWeeks = config.history.length;
  const totalDays = totalWeeks * config.interval;

  let doseEvents = [];
  for (let day = 0; day < totalDays; day += config.interval) {
    doseEvents.push({ time: day, dose: config.dose });
  }

  const sampleCount = Math.floor(totalDays / config.outputStep) + 1;
  const levels = new Array(sampleCount).fill(0);
  const weightFactor = 70 / config.weightKg;

  for (let i = 0; i < sampleCount; i++) {
    const t = i * config.outputStep;
    let total = 0;
    doseEvents.forEach((e) => {
      const dt = t - e.time;
      if (dt > 0 && dt < 150) {
        const tPeak = Math.log(ka / ke) / (ka - ke);
        const fMax = Math.exp(-ke * tPeak) - Math.exp(-ka * tPeak);
        let val = (Math.exp(-ke * dt) - Math.exp(-ka * dt)) / fMax;
        val = val * e.dose * scale;
        total += val * weightFactor;
      }
    });
    levels[i] = total;
  }

  let results = [];
  for (let w = 0; w < totalWeeks; w++) {
    let startIdx = w * config.interval;
    let endIdx = (w + 1) * config.interval;
    let weekLevels = levels.slice(startIdx, endIdx);
    results.push({ peak: Math.max(...weekLevels), trough: levels[endIdx] });
  }
  return results;
}

function calculateOptimizationError(ka, ke, scale) {
  if (ka <= ke || ka <= 0 || ke <= 0 || scale <= 0) return Infinity;
  let sim = simulateConcentration(ka, ke, scale, CONFIG);

  let error = 0;
  for (let i = 1; i < CONFIG.history.length; i++) {
    let realDeltaPeak = CONFIG.history[i].peak - CONFIG.history[0].peak;
    let simDeltaPeak = sim[i].peak - sim[0].peak;

    let realDeltaTrough = CONFIG.history[i].trough - CONFIG.history[0].trough;
    let simDeltaTrough = sim[i].trough - sim[0].trough;

    error += Math.pow(simDeltaPeak - realDeltaPeak, 2);
    error += Math.pow(simDeltaTrough - realDeltaTrough, 2);
  }
  return error;
}

function updateConsoleOutput(msg) {
  console.clear();
  console.log(msg);
}

function runOptimizationSolver() {
  return new Promise((resolve) => {
    const TARGET_TIME = 60000; 
    const startTime = Date.now();

    let bestKa = 0.5,
      bestKe = 0.1,
      bestScale = 4.0;
    let minError = Infinity;
    let iterationCount = 0;

    function solverStep() {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / TARGET_TIME;

      let radius = 2.0 * (1.0 - progress);
      if (radius < 0.001) radius = 0.001;

      for (let i = 0; i < 500; i++) {
        iterationCount++;

        let testKa = bestKa + (Math.random() - 0.5) * radius;
        let testKe = bestKe + (Math.random() - 0.5) * (radius * 0.2);
        let testScale = bestScale + (Math.random() - 0.5) * (radius * 5);

        if (testKa <= testKe || testKa <= 0 || testKe <= 0 || testScale <= 0)
          continue;

        let err = calculateOptimizationError(testKa, testKe, testScale);
        if (err < minError) {
          minError = err;
          bestKa = testKa;
          bestKe = testKe;
          bestScale = testScale;
        }
      }

      const barLength = 20;
      const filled = Math.round(barLength * Math.min(progress, 1));
      const bar = "█".repeat(filled) + "░".repeat(barLength - filled);

      updateConsoleOutput(
        `RUNNING SOLVER [${bar}] ${(Math.min(progress, 1) * 100).toFixed(1)}% | Iterations: ${iterationCount} | Current Error: ${minError.toFixed(2)}`,
      );

      if (elapsed < TARGET_TIME) {
        setTimeout(solverStep, 0);
      } else {
        let sim = simulateConcentration(bestKa, bestKe, bestScale, CONFIG);
        let targetPureStablePeak = 873 - 20;
        bestScale = (targetPureStablePeak / sim[13].peak) * bestScale;

        resolve({ ka: bestKa, ke: bestKe, scale: bestScale });
      }
    }

    solverStep();
  });
}

runOptimizationSolver().then((res) => {
  console.clear();
  console.log("\n=======================================================");
  console.log("               PARAMS SOLVER RESULTS                   ");
  console.log("=======================================================");
  console.log(`ka:    ${res.ka.toFixed(6)}`);
  console.log(`ke:    ${res.ke.toFixed(6)}`);
  console.log(`scale: ${res.scale.toFixed(6)}`);
  console.log("=======================================================");

  let simResults = simulateConcentration(res.ka, res.ke, res.scale, CONFIG);

  console.log("Comparison Table (Target vs Simulated):");
  CONFIG.history.forEach((target, i) => {
    let currentPeak = Math.round(simResults[i].peak + 20);
    let currentTrough = Math.round(simResults[i].trough + 20);

    let diffP = currentPeak - target.peak;
    let diffT = currentTrough - target.trough;

    let statusP = diffP === 0 ? "EXACT" : `${diffP >= 0 ? "+" : ""}${diffP}`;
    let statusT = diffT === 0 ? "EXACT" : `${diffT >= 0 ? "+" : ""}${diffT}`;

    console.log(`Dose ${i + 1}:`);
    console.log(`  Peak:   ${target.peak} -> ${currentPeak} (Diff: ${statusP})`);
    console.log(`  Trough: ${target.trough} -> ${currentTrough} (Diff: ${statusT})`);
  });
  console.log("=======================================================");
});
