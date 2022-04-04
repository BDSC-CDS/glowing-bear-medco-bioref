//spec

import { Interval } from "./explore-statistics.service";
import { ReferenceIntervalComputer } from "./reference-intervals";

function refIntervalTest1() {

    const intervals = [
        new Interval("1", "2", 3),
        new Interval("2", "3", 4),
        new Interval("3", "4", 6),
        new Interval("5", "6", 5),
    ]

    const computer = new ReferenceIntervalComputer(intervals)
    expect(computer.binWidth).toEqual(1)

    const recreatedData = computer.recreateData()
    expect(recreatedData).toEqual(
        [1.5, 1.5, 1.5,
            2.5, 2.5, 2.5, 2.5,
            3.5, 3.5, 3.5, 3.5, 3.5, 3.5,
            5.5, 5.5, 5.5, 5.5, 5.5,
        ])



}

describe("Reference interval tests", () => {
    it("should compute bin width correctly and recreate data correctly", () => {
        refIntervalTest1()
    })

    it("should run fQuantile correctly", () => {
        const data = []
        for (let i = 0; i <= 99; i++) {
            data.push(i) // [0, 1, 2, 3, ..., 99]
        }
        const quantiles = ReferenceIntervalComputer.quantile(data)
        expect(quantiles[0]).toEqual(5)
        expect(quantiles[1]).toEqual(95)
    })

    it("Should run mean correctly", () => {
        const m = ReferenceIntervalComputer.mean
        expect(m([1, 2, 3, 4])).toEqual(2.5)
        expect(m([5, 5, 5, 5, 5])).toEqual(5)
        expect(m([10, 20])).toEqual(15)
    })

    it("should compute RI correctly on testData1", () => {
        // around 20.5 to 26.5

        // 70.5 to 75.5

        const intervals = testData1.map(interval => {
            return new Interval("" + interval[2], "" + interval[1], interval[0])
        })

        const computer = new ReferenceIntervalComputer(intervals)
        const RI = computer.compute()

        expect(RI[0].lowerBound).toEqual(20)
        expect(RI[0].middle).toEqual(23)
        expect(RI[0].higherBound).toEqual(25)

        expect(RI[1].lowerBound).toEqual(70)
        expect(RI[1].middle).toEqual(73)
        expect(RI[1].higherBound).toEqual(75)

    })
})

//array of ["count","higherBound","lowerBound"]
const testData1: [number, number, number][] =
    [[3, 14, 13],
    [1, 15, 14],
    [0, 16, 15],
    [0, 17, 16],
    [2, 18, 17],
    [2, 19, 18],
    [3, 20, 19],
    [5, 21, 20],
    [4, 22, 21],
    [5, 23, 22],
    [4, 24, 23],
    [4, 25, 24],
    [6, 26, 25],
    [4, 27, 26],
    [6, 28, 27],
    [5, 29, 28],
    [8, 30, 29],
    [10, 31, 30],
    [15, 32, 31],
    [16, 33, 32],
    [11, 34, 33],
    [14, 35, 34],
    [20, 36, 35],
    [20, 37, 36],
    [29, 38, 37],
    [13, 39, 38],
    [23, 40, 39],
    [23, 41, 40],
    [30, 42, 41],
    [19, 43, 42],
    [33, 44, 43],
    [37, 45, 44],
    [39, 46, 45],
    [29, 47, 46],
    [30, 48, 47],
    [45, 49, 48],
    [28, 50, 49],
    [23, 51, 50],
    [32, 52, 51],
    [23, 53, 52],
    [33, 54, 53],
    [28, 55, 54],
    [32, 56, 55],
    [22, 57, 56],
    [36, 58, 57],
    [21, 59, 58],
    [21, 60, 59],
    [25, 61, 60],
    [16, 62, 61],
    [20, 63, 62],
    [14, 64, 63],
    [9, 65, 64],
    [11, 66, 65],
    [12, 67, 66],
    [8, 68, 67],
    [11, 69, 68],
    [7, 70, 69],
    [15, 71, 70],
    [3, 72, 71],
    [5, 73, 72],
    [6, 74, 73],
    [2, 75, 74],
    [6, 76, 75],
    [4, 77, 76],
    [3, 78, 77],
    [2, 79, 78],
    [0, 80, 79],
    [1, 81, 80],
    [1, 82, 81],
    [0, 83, 82],
    [0, 84, 83],
    [0, 85, 84],
    [1, 86, 85],
    [0, 87, 86],
    [0, 88, 87],
    [0, 89, 88],
    [0, 90, 89],
    [0, 91, 90],
    [0, 92, 91],
    [0, 93, 92],
    [0, 94, 93],
    [1, 95, 94],
    [0, 96, 95]];

