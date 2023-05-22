const {objPath,objPathParent}=require('./src/object-util')
let a={test:[{no:1}]}
//console.log(objPath(a,'test[0]'))
console.log(objPathParent(a, "test[1].a[0].b",true))
console.log('done')
