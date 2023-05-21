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
function objPath(obj,path){
  let pa
  if (typeof path==='string'){
    pa=path.split('.')
  }else{
    pa=path
  }
  
  let tmp=obj
  for (let p of pa){
    if (tmp!==undefined){
      //tmp=tmp[p]
      tmp=Reflect.get(tmp,p)
    }else{
      
      return  null
    }
    
  }

  return tmp 
}
function objPathParent(obj,path,force){
  let pa=path.split('.')
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
    Reflect.set(parent,attr,val)
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
const useObjUtil=(obj)=>{
  
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