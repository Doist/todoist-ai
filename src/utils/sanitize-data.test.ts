import { removeNullFields } from './sanitize-data.js'

describe('removeNullFields', () => {
    it('should remove null fields from objects including nested objects', () => {
        const input = {
            name: 'John',
            age: null,
            email: 'john@example.com',
            phone: null,
            address: {
                street: '123 Main St',
                city: null,
                country: 'USA',
            },
        }

        const result = removeNullFields(input)

        expect(result).toEqual({
            name: 'John',
            email: 'john@example.com',
            address: {
                street: '123 Main St',
                country: 'USA',
            },
        })
    })

    it('should handle arrays with null values', () => {
        const input = {
            items: [
                { id: 1, value: 'test' },
                { id: 2, value: null },
                { id: 3, value: 'another' },
            ],
        }

        const result = removeNullFields(input)

        expect(result).toEqual({
            items: [{ id: 1, value: 'test' }, { id: 2 }, { id: 3, value: 'another' }],
        })
    })

    it('should handle null objects', () => {
        const result = removeNullFields(null)
        expect(result).toBeNull()
    })

    it('should remove empty objects and empty arrays', () => {
        const input = {
            something: 'hello',
            another: {},
            yetAnother: [],
        }

        const result = removeNullFields(input)

        expect(result).toEqual({
            something: 'hello',
        })
    })

    it('should remove empty objects and empty arrays in nested structures', () => {
        const input = {
            name: 'Test',
            metadata: {},
            tags: [],
            nested: {
                data: 'value',
                emptyObj: {},
                emptyArr: [],
                deepNested: {
                    anotherEmpty: {},
                },
            },
            items: [
                { id: 1, data: 'test', empty: {} },
                { id: 2, list: [] },
            ],
        }

        const result = removeNullFields(input)

        expect(result).toEqual({
            name: 'Test',
            nested: {
                data: 'value',
            },
            items: [{ id: 1, data: 'test' }, { id: 2 }],
        })
    })

    it('should keep arrays with values and objects with properties', () => {
        const input = {
            emptyArray: [],
            arrayWithValues: [1, 2, 3],
            emptyObject: {},
            objectWithProps: { key: 'value' },
        }

        const result = removeNullFields(input)

        expect(result).toEqual({
            arrayWithValues: [1, 2, 3],
            objectWithProps: { key: 'value' },
        })
    })
})
