// Normal Distribution

const round = (value: number, decimalPlaces: number) => {
  const factor = Math.pow(10, decimalPlaces);
  return Math.round(value * factor) / factor;
};

export default class NormalDistribution {
  public mean: number;
  public standardDeviation: number;

  /**
   * The constructor, assumes a standardized normal distribution if
   *   there are no parameters given
   * @param {number} [mean=0] - the mean average
   * @param {number} [standardDeviation=1] - the standard deviation
   */
  constructor(mean = 0, standardDeviation = 1) {
    this.mean = mean;
    this.standardDeviation = standardDeviation;
  }

  /**
   * @param {number} value - the number to convert to a z-score
   * @return {number} the z-score of the value
   */
  zScore(value: number) {
    return (value - this.mean) / this.standardDeviation;
  }

  /**
   * Return the probability of finding x in the distribution
   * @param {number} value - the value to evaluate
   * @return {number} the probability
   */
  pdf(value: number) {
    const dividend =
      Math.E ** -((value - this.mean) ** 2 / (2 * this.standardDeviation ** 2));
    const divisor = this.standardDeviation * Math.sqrt(2 * Math.PI);
    return dividend / divisor;
  }

  /**
   * Return the cumalitive probability for everything left of the value
   * @param {number} value - the value to evaluate
   * @return {number} the cumulative total
   */
  cdf(value: number) {
    let zScore = this.zScore(value);
    zScore = round(zScore, 2);

    if (zScore === 0) {
      return 0.5;
    } else if (zScore <= -3.5) {
      return 0;
    } else if (zScore >= 3.5) {
      return 1;
    }

    const zTable = NormalDistribution.zTable;
    const absZScore = Math.abs(zScore);
    const zRow = Math.floor(absZScore * 10) / 10;
    const zCol = round((Math.round(absZScore * 100) % 10) / 100, 2);
    const zColIndex = zTable.z.indexOf(zCol);
    const absPercentile = zTable[zRow][zColIndex];

    return zScore < 0 ? 1 - absPercentile : absPercentile;
  }

  /**
   * Return the probability of a value in the distribution being
   *   between two values
   * @param {number} value1 - the first boundary
   * @param {number} value2 - the second boundary
   * @return {number} the probability
   */
  probabilityBetween(value1: number, value2: number) {
    return Math.abs(this.cdf(value1) - this.cdf(value2));
  }
