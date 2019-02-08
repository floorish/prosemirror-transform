const ist = require("ist")
const {Mapping, StepMap, findWrapping, Transform} = require("../dist")
const {schema, doc, p} = require("prosemirror-test-builder")

function testMapping(mapping, ...cases) {
  let inverted = mapping.invert()
  for (let i = 0; i < cases.length; i++) {
    let [from, to, bias = 1, lossy] = cases[i]
    ist(mapping.map(from, bias), to)
    if (!lossy) ist(inverted.map(to, bias), from)
  }
}

function mk(...args) {
  let mapping = new Mapping
  args.forEach(arg => {
    if (Array.isArray(arg)) mapping.appendMap(new StepMap(arg))
    else for (let from in arg) mapping.setMirror(from, arg[from])
  })
  return mapping
}

describe("Mapping", () => {
  it("can map through a single insertion", () => {
    testMapping(mk([2, 0, 4]), [0, 0], [2, 6], [2, 2, -1], [3, 7])
  })

  it("can map through a single deletion", () => {
    testMapping(mk([2, 4, 0]), [0, 0], [2, 2, -1], [3, 2, 1, true], [6, 2, 1], [6, 2, -1, true], [7, 3])
  })

  it("can map through a single replace", () => {
    testMapping(mk([2, 4, 4]), [0, 0], [2, 2, 1], [4, 6, 1, true], [4, 2, -1, true], [6, 6, -1], [8, 8])
  })

  it("can map through a mirrorred delete-insert", () => {
    testMapping(mk([2, 4, 0], [2, 0, 4], {0: 1}), [0, 0], [2, 2], [4, 4], [6, 6], [7, 7])
  })

  it("cap map through a mirrorred insert-delete", () => {
    testMapping(mk([2, 0, 4], [2, 4, 0], {0: 1}), [0, 0], [2, 2], [3, 3])
  })

  it("can map through an delete-insert with an insert in between", () => {
    testMapping(mk([2, 4, 0], [1, 0, 1], [3, 0, 4], {0: 2}), [0, 0], [1, 2], [4, 5], [6, 7], [7, 8])
  })

  describe("wrap", () => {

    function testWrapMap(doc, expect, type, attrs) {
      let range = doc.resolve(doc.tag.a).blockRange(doc.resolve(doc.tag.b || doc.tag.a))
      const t = new Transform(doc).wrap(range, findWrapping(range, schema.nodes[type], attrs))

      let changes = []
      t.steps.map(s => s.getMap()).forEach(sm => {
        sm.forEach((fromA, toA, fromB, toB) => changes.push([fromA, toA, fromB, toB]))
      })

      ist(JSON.stringify(changes), JSON.stringify(expect))
    }

    it("get correct mapping from replaceAround", () => {
      // 0  1 2 3   4
      // <p> ab </p>
      // 0  1   2 3 4   5    6
      // <q> <p> ab </p> </q>
      testWrapMap(doc(p("<a>ab")), [[0, 0, 0, 1], [5, 5, 5, 6]], "blockquote")
    })

    it("get correct mapping from replaceAround 2", () => {
      // <p> ab </p> <p> def </p> <p> ghi </p>
      // <q> <p> ab </p> <p> def </p> </q> <p> ghi </p>
      testWrapMap(doc(p("<a>ab"), p("def<b>"), p("ghi")), [[0, 0, 0, 1], [10, 10, 10, 11]], "blockquote")
    })

  })

})
