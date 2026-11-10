import type { LabTest } from '../types'

/**
 * Sub-tests ticked as Multiple can be billed alone. Each becomes its own billable test carrying that one
 * sub-test, so billing, the lab bench and the report treat it like any other test.
 */
export function standaloneTests(tests: LabTest[]): LabTest[] {
  return tests.flatMap((test) =>
    test.subTests.flatMap((subTest, index) =>
      subTest.multiple && subTest.price && subTest.price > 0
        ? [{ ...test, id: `${test.id}#${subTest.name}`, code: `${test.code}-S${index + 1}`, name: `${subTest.name} only`, price: subTest.price, description: `${subTest.name} from ${test.name}, billed on its own.`, subTests: [subTest] }]
        : [],
    ),
  )
}

/** Every test staff can put on a bill or work on at the bench: the full tests plus their single sub-tests. */
export const orderableTests = (tests: LabTest[]) => [...tests, ...standaloneTests(tests)]
