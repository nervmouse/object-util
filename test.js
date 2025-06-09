const { objPath, objPathParent, objPathSet } = require("./dist/object-util")
let a = {}
//let a={test:[{no:1}]}
//console.log(objPath(a,'test[0]'))
//console.log(objPathParent(a, "test[1].a[0].b",true))
objPathSet(a, "test[].b", "cc", true)
console.log(a, "done")
