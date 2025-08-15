import { DurationParseError, formatDuration, parseDuration } from './duration-parser.js'

describe('parseDuration', () => {
    describe('valid formats', () => {
        it('should parse hours only', () => {
            expect(parseDuration('2h')).toEqual({ minutes: 120 })
            expect(parseDuration('1h')).toEqual({ minutes: 60 })
            expect(parseDuration('24h')).toEqual({ minutes: 1440 })
        })

        it('should parse minutes only', () => {
            expect(parseDuration('90m')).toEqual({ minutes: 90 })
            expect(parseDuration('45m')).toEqual({ minutes: 45 })
            expect(parseDuration('1m')).toEqual({ minutes: 1 })
            expect(parseDuration('1440m')).toEqual({ minutes: 1440 })
        })

        it('should parse hours and minutes combined', () => {
            expect(parseDuration('2h30m')).toEqual({ minutes: 150 })
            expect(parseDuration('1h45m')).toEqual({ minutes: 105 })
            expect(parseDuration('0h30m')).toEqual({ minutes: 30 })
            expect(parseDuration('23h59m')).toEqual({ minutes: 1439 })
        })

        it('should parse decimal hours', () => {
            expect(parseDuration('1.5h')).toEqual({ minutes: 90 })
            expect(parseDuration('2.25h')).toEqual({ minutes: 135 })
            expect(parseDuration('0.5h')).toEqual({ minutes: 30 })
            expect(parseDuration('0.75h')).toEqual({ minutes: 45 })
        })

        it('should handle spaces in input', () => {
            expect(parseDuration('2h 30m')).toEqual({ minutes: 150 })
            expect(parseDuration(' 1h45m ')).toEqual({ minutes: 105 })
            expect(parseDuration('  2h  ')).toEqual({ minutes: 120 })
            expect(parseDuration(' 90m ')).toEqual({ minutes: 90 })
        })

        it('should handle case insensitive input', () => {
            expect(parseDuration('2H')).toEqual({ minutes: 120 })
            expect(parseDuration('90M')).toEqual({ minutes: 90 })
            expect(parseDuration('2H30M')).toEqual({ minutes: 150 })
            expect(parseDuration('1.5H')).toEqual({ minutes: 90 })
        })

        it('should round decimal minutes from decimal hours', () => {
            expect(parseDuration('1.33h')).toEqual({ minutes: 80 }) // 1.33 * 60 = 79.8 -> 80
            expect(parseDuration('1.67h')).toEqual({ minutes: 100 }) // 1.67 * 60 = 100.2 -> 100
        })
    })

    describe('invalid formats', () => {
        it('should throw error for empty or null input', () => {
            expect(() => parseDuration('')).toThrow(DurationParseError)
            expect(() => parseDuration('   ')).toThrow('Duration must be a non-empty string')
            // biome-ignore lint/suspicious/noExplicitAny: Testing error cases with invalid types
            expect(() => parseDuration(null as any)).toThrow('Duration must be a non-empty string')
            // biome-ignore lint/suspicious/noExplicitAny: Testing error cases with invalid types
            expect(() => parseDuration(undefined as any)).toThrow(
                'Duration must be a non-empty string',
            )
        })

        it('should throw error for invalid format', () => {
            expect(() => parseDuration('2')).toThrow(
                'Use format like "2h", "30m", "2h30m", or "1.5h"',
            )
            expect(() => parseDuration('2hours')).toThrow('Use format like')
            expect(() => parseDuration('2h30')).toThrow('Use format like')
            expect(() => parseDuration('h30m')).toThrow('Use format like')
            expect(() => parseDuration('2x30m')).toThrow('Use format like')
            expect(() => parseDuration('2h30s')).toThrow('Use format like')
        })

        it('should throw error for decimal minutes', () => {
            expect(() => parseDuration('90.5m')).toThrow('Minutes must be a whole number')
            expect(() => parseDuration('1h30.5m')).toThrow('Minutes must be a whole number')
        })

        it('should throw error for negative values', () => {
            expect(() => parseDuration('-2h')).toThrow('Use format like')
            expect(() => parseDuration('-30m')).toThrow('Use format like')
            expect(() => parseDuration('2h-30m')).toThrow('Use format like')
        })

        it('should throw error for zero duration', () => {
            expect(() => parseDuration('0h')).toThrow('Duration must be greater than 0 minutes')
            expect(() => parseDuration('0m')).toThrow('Duration must be greater than 0 minutes')
            expect(() => parseDuration('0h0m')).toThrow('Duration must be greater than 0 minutes')
        })

        it('should throw error for duration exceeding 24 hours', () => {
            expect(() => parseDuration('25h')).toThrow(
                'Duration cannot exceed 24 hours (1440 minutes)',
            )
            expect(() => parseDuration('1441m')).toThrow(
                'Duration cannot exceed 24 hours (1440 minutes)',
            )
            expect(() => parseDuration('24h1m')).toThrow(
                'Duration cannot exceed 24 hours (1440 minutes)',
            )
            expect(() => parseDuration('24.1h')).toThrow(
                'Duration cannot exceed 24 hours (1440 minutes)',
            )
        })

        it('should throw error for malformed numbers', () => {
            expect(() => parseDuration('2.h')).toThrow('Hours must be a positive number')
            expect(() => parseDuration('2h.m')).toThrow('Minutes must be a positive number')
            expect(() => parseDuration('2..5h')).toThrow('Hours must be a positive number')
        })

        it('should throw error for duplicate units', () => {
            expect(() => parseDuration('2h3h')).toThrow('Use format like')
            expect(() => parseDuration('30m45m')).toThrow('Use format like')
        })
    })

    describe('edge cases', () => {
        it('should handle maximum allowed duration', () => {
            expect(parseDuration('24h')).toEqual({ minutes: 1440 })
            expect(parseDuration('1440m')).toEqual({ minutes: 1440 })
            expect(parseDuration('23h60m')).toEqual({ minutes: 1440 })
        })

        it('should handle minimum allowed duration', () => {
            expect(parseDuration('1m')).toEqual({ minutes: 1 })
            expect(parseDuration('0.017h')).toEqual({ minutes: 1 }) // 0.017 * 60 = 1.02 -> 1
        })
    })
})

describe('formatDuration', () => {
    it('should format minutes only', () => {
        expect(formatDuration(45)).toBe('45m')
        expect(formatDuration(1)).toBe('1m')
        expect(formatDuration(59)).toBe('59m')
    })

    it('should format hours only', () => {
        expect(formatDuration(60)).toBe('1h')
        expect(formatDuration(120)).toBe('2h')
        expect(formatDuration(1440)).toBe('24h')
    })

    it('should format hours and minutes combined', () => {
        expect(formatDuration(90)).toBe('1h30m')
        expect(formatDuration(150)).toBe('2h30m')
        expect(formatDuration(105)).toBe('1h45m')
        expect(formatDuration(1439)).toBe('23h59m')
    })

    it('should handle edge cases', () => {
        expect(formatDuration(0)).toBe('0m')
        expect(formatDuration(-5)).toBe('0m')
    })
})

describe('round trip parsing and formatting', () => {
    const testCases = [
        { input: '2h', expectedMinutes: 120, expectedFormat: '2h' },
        { input: '45m', expectedMinutes: 45, expectedFormat: '45m' },
        { input: '2h30m', expectedMinutes: 150, expectedFormat: '2h30m' },
        { input: '1.5h', expectedMinutes: 90, expectedFormat: '1h30m' },
    ]

    for (const { input, expectedMinutes, expectedFormat } of testCases) {
        it(`should parse "${input}" and format back consistently`, () => {
            const parsed = parseDuration(input)
            expect(parsed.minutes).toBe(expectedMinutes)
            expect(formatDuration(parsed.minutes)).toBe(expectedFormat)
        })
    }
})
