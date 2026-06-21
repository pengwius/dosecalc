const MAX_TIME_DELTA_DAYS = 150;

export function calculateSingleDoseContribution(
  esterParams,
  timeDeltaDays,
  doseMg,
  weightFactor,
) {
  const { ka, ke, scale, type } = esterParams;
  if (timeDeltaDays <= 0 || timeDeltaDays >= MAX_TIME_DELTA_DAYS) return 0;

  let contribution = 0;
  if (type === "continuous") {
    contribution = scale * doseMg * Math.exp(-ke * timeDeltaDays);
  } else {
    const timeToPeak = Math.log(ka / ke) / (ka - ke);
    const maxConcentration =
      Math.exp(-ke * timeToPeak) - Math.exp(-ka * timeToPeak);
    contribution =
      (Math.exp(-ke * timeDeltaDays) - Math.exp(-ka * timeDeltaDays)) /
      maxConcentration;
    contribution = contribution * doseMg * scale;
  }
  return contribution * weightFactor;
}

export function calculateProtocolLevels(
  esterParams,
  totalDays,
  doseEvents,
  weightKg,
  outputStep,
  useSteadyState,
  protocolDose,
) {
  const sampleCount = Math.floor(totalDays / outputStep) + 1;
  const concentrationData = new Array(sampleCount).fill(0);
  const weightFactor = 70 / weightKg;

  let extendedEvents = [...doseEvents];
  if (useSteadyState && doseEvents.length > 0) {
    const firstEvent = doseEvents[0];
    const secondEvent = doseEvents[1];
    const actualInterval = secondEvent ? secondEvent.time - firstEvent.time : 7;
    const baseDose =
      protocolDose !== undefined && !isNaN(protocolDose)
        ? protocolDose
        : firstEvent.dose;
    for (let i = 1; i <= 50; i++) {
      extendedEvents.push({
        time: firstEvent.time - i * actualInterval,
        dose: baseDose,
      });
    }
  }

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
    const currentTime = sampleIndex * outputStep;
    let totalConcentration = 0;
    extendedEvents.forEach((event) => {
      totalConcentration += calculateSingleDoseContribution(
        esterParams,
        currentTime - event.time,
        event.dose,
        weightFactor,
      );
    });
    concentrationData[sampleIndex] = totalConcentration;
  }
  return concentrationData;
}

export function simulateHpgAxisFeedback(
  exogenousE2,
  exogenousT,
  blockerEffectArray,
  isAmab,
  outputStep,
  useSteadyState,
) {
  const sampleCount = exogenousE2.length;
  const finalE2 = new Array(sampleCount);
  const finalT = new Array(sampleCount);

  const BASE_E2_AMAB = 20;
  const BASE_T_AMAB = 500;
  const BASE_E2_AFAB = 100;
  const BASE_T_AFAB = 35;
  const ADRENAL_T = 20;
  const HPG_INERTIA_FACTOR = 0.05;

  const baseE2 = isAmab ? BASE_E2_AMAB : BASE_E2_AFAB;
  const baseT = isAmab ? BASE_T_AMAB : BASE_T_AFAB;

  let hpgSuppressionLevel = 1.0;
  if (useSteadyState) {
    const initialExoE2 = exogenousE2[0] || 0;
    const initialExoT = exogenousT[0] || 0;
    hpgSuppressionLevel = isAmab
      ? 1 / (1 + Math.pow(initialExoE2 / 100, 3.0))
      : 1 / (1 + Math.pow(initialExoT / 300, 2.5));
  }

  for (let i = 0; i < sampleCount; i++) {
    const currentExoE2 = exogenousE2[i] || 0;
    const currentExoT = exogenousT[i] || 0;
    const stepsPerDay = Math.round(1 / outputStep);

    let smoothedE2Sum = 0;
    let smoothingCount = 0;
    for (let j = Math.max(0, i - stepsPerDay); j <= i; j++) {
      smoothedE2Sum += exogenousE2[j] || 0;
      smoothingCount++;
    }
    const smoothedE2 =
      smoothingCount > 0 ? smoothedE2Sum / smoothingCount : currentExoE2;

    if (isAmab) {
      const targetSuppression = 1 / (1 + Math.pow(smoothedE2 / 100, 3.0));
      hpgSuppressionLevel = useSteadyState
        ? targetSuppression
        : hpgSuppressionLevel +
          (targetSuppression - hpgSuppressionLevel) * HPG_INERTIA_FACTOR;

      finalE2[i] = Math.round(baseE2 + currentExoE2);

      const gonadalT =
        (baseT - ADRENAL_T) *
        hpgSuppressionLevel *
        (1 - (blockerEffectArray[i] || 0));
      finalT[i] = Math.round(gonadalT + currentExoT + ADRENAL_T);
    } else {
      const targetSuppression = 1 / (1 + Math.pow(currentExoT / 300, 2.5));
      hpgSuppressionLevel = useSteadyState
        ? targetSuppression
        : hpgSuppressionLevel +
          (targetSuppression - hpgSuppressionLevel) * HPG_INERTIA_FACTOR;

      finalT[i] = Math.round(baseT + currentExoT);
      finalE2[i] = Math.round(baseE2 * hpgSuppressionLevel + currentExoE2);
    }
  }

  return { finalE2, finalT };
}
