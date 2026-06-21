export class DosageCalculator {
  static calculateVolumeFromAmount(amount, concAmount, concVol) {
    if (!amount || !concAmount || !concVol) return 0;
    return (amount / concAmount) * concVol;
  }

  static calculateAmountFromVolume(volume, concAmount, concVol) {
    if (!volume || !concAmount || !concVol) return 0;
    return (volume / concVol) * concAmount;
  }

  static calculateSyringeUnits(volume, syringeUnits, syringeMl) {
    if (!volume || !syringeUnits || !syringeMl) return 0;
    return volume * (syringeUnits / syringeMl);
  }

  static calculateVialLifeDays(vialVolumeMl, doseVolumeMl, frequencyDays) {
    if (!vialVolumeMl || !doseVolumeMl || !frequencyDays) return null;
    return Math.floor((vialVolumeMl / doseVolumeMl) * frequencyDays);
  }

  static formatDuration(days) {
    if (days >= 365) return `~${(days / 365).toFixed(1)} years`;
    if (days >= 30) return `~${(days / 30.44).toFixed(1)} months`;
    if (days >= 7) return `~${(days / 7).toFixed(1)} weeks`;
    return `${days} days`;
  }
}
