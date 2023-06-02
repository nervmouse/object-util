function objPathJoin(basePath,...paths){
  let ptahArr=basePath.split('.')
  for(let path of paths){
    while (path.substr(0,1)==='.'){
      if (path.substr(0,3)==='../'){
        path=path.substr(3)
        ptahArr.pop()
      }else if (path.substr(0,2)==='./'){
        path=path.substr(2)
      }else{
        path=path.substr(1)
      }
    }
    ptahArr=ptahArr.concat(path.split('.'))

  }
  return ptahArr.join('.')

}
function* pathWalk(path) {
  let pa
  if (typeof path==='string'){
    //pa=path.split(/\]?[\[\.]/g)
    pa = path.split(/[\.\[]/g)
  }else{
    pa=path
  }
  let depth=0
  const totalDepth = pa.length-1
  for (let rawProp of pa){
    let isArray=false
    let prop=rawProp
    const len=rawProp.length
    
    if (prop[len - 1] === "]") {
      if (prop==="]"){
        prop = null
        rawProp='[]'
        isArray = true
      }else{
        try {
          const tmp_p = Number(prop.substring(0, len - 1))
          if (!isNaN(tmp_p)) {
            prop = tmp_p
            rawProp='['+rawProp
            isArray = true
          }
        } catch (e) {
          console.log(e)
        }
      }
      
    }
    yield { depth,totalDepth, prop,rawProp, isArray }
    depth++
    
  }
}
function objPath(obj,path){
  let tmp = obj
  for (const {prop,isArray} of pathWalk(path)){
    if (tmp !== undefined) {
      //tmp=tmp[p]
      tmp = Reflect.get(tmp, prop)
    } else {
      //try array

      return null
    }
  }
  

  return tmp 
}
function objPathParent(obj, path, force) {
  let attr
  let parent = obj
  let lastParent=obj
  let parentProp=''
  let parentPa=[]
  let parentPath=''
  let makeParent=false
  for (const { depth,totalDepth, prop,rawProp, isArray } of pathWalk(path)) {
    if (makeParent){
        if (isArray) {
          parent = []
        } else {
          parent = {}
        }
        if (Array.isArray(lastParent) && parentProp===null){
          //Reflect.set(lastParent, parentProp, parent)
          lastParent.push(parent)
        }else{
          Reflect.set(lastParent, parentProp, parent)

        }
        makeParent=false
    }
      if (depth === totalDepth) {
        //last
        attr = prop
      } else {
        parentPa.push(rawProp)
        lastParent = parent
        if (parent !== undefined) parent = Reflect.get(parent, prop)
        if (parent === undefined) {
          if (force) {
            makeParent = true
            parentProp = prop
          }
        }

        //parentProp = prop
        if (isArray || parentPath === "") {
          parentPath += rawProp
        } else {
          parentPath += "." + rawProp
        }
      }
  }

  
  return { parent, parent_path: parentPath, attr }
}
function objPathParent_bak(obj,path,force){
  let pa=path.split(/\]?[\[\.]/g)
  let attr=pa.pop()
  let parent_path=pa.join('.')
  let parent=objPath(obj,pa)
  if (!parent && force ){
    let tmp=obj
    for (let p of pa){
      if (typeof tmp[p] !=='object'){
        //tmp[p]={}
        Reflect.set(tmp,p,{})
      }
      tmp=Reflect.get(tmp,p)
      //tmp=tmp[p]
    }
    parent=tmp
  }
  return {parent,parent_path,attr}
}

function objPathSet(obj,path,val,force){
  let {parent,attr}=objPathParent(obj,path,force)
  if (parent){
    //parent[attr]=val
    if (Array.isArray(parent) && attr===null){
      parent.push(val)
    }else{
      Reflect.set(parent,attr,val)

    }
  }
}

function objPathDelete(obj,path){
  let {parent,attr}=objPathParent(obj,path)
  if (parent){
    Reflect.deleteProperty(parent,attr)
    //delete parent[attr]
  }
}
function objMoveProp(obj,path,step){
  //move the sequence of prop
  // {a,b,c} -> path:a, step:1-> {b,a,c}
  if (step){
    const {parent,attr}=objPathParent(obj,path,false)
    if (parent){
      const children=Object.entries(parent)
      const keys=Object.keys(parent)
      const len=keys.length
      
      let pos=keys.indexOf(attr)
      let target_pos=pos+step
      if (target_pos<0){
        target_pos=0
      }else if(target_pos>=len){
        target_pos=len-1
      }
      if (target_pos!==pos){
        const tmp=children[target_pos]
        children[target_pos]=children[pos]
        children[pos]=tmp
        for(let key of keys){
          Reflect.deleteProperty(parent,key)
        }
        for(let [key,val] of children){
          Reflect.set(parent,key,val)
        }

      }

      
      
    }
  }
  return obj
}

//deep copy
function objCopy(obj){
  
  return JSON.parse(JSON.stringify(obj))
  
}
function objWalk(obj,callback){
  const tasks=[{
    obj,
    pathArr:[]
  }]
  while (tasks.length>0){
    const task=tasks.pop()
    const {obj,pathArr}=task
    if (obj){
      let skip=false
      let cbRes=callback(obj,pathArr)
      if (cbRes && cbRes.skip){
        skip=true
      }
      if (!skip){
        for(const [prop,val] of Object.entries(obj)){
          const subPathArr=pathArr.concat(prop)
          if (typeof val === 'object' && !Array.isArray(val)){
            tasks.push({
              obj:val,
              pathArr:subPathArr
            })
          }else{
            callback(val,subPathArr)
          }
        }
      }
      
    }
  }
}
const useObjUtil=(obj,inplace=true)=>{
  if(!inplace){
    obj=objCopy(obj)
  }
  return {
    obj,
    parent:objPathParent.bind(obj,obj),
    get:objPath.bind(obj,obj),
    set:objPathSet.bind(obj,obj),
    delete:objPathDelete.bind(obj,obj),
    copy:objCopy.bind(obj,obj),
    walk:objWalk.bind(obj,obj)
  }
}
module.exports ={
  objPathJoin,
  objPath,
  objPathParent,
  objPathSet,
  objPathDelete,
  objMoveProp,
  objCopy,
  objWalk,
  useObjUtil
}