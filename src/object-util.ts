// Type definitions
type ObjectPath = string | string[];
type AnyObject = Record<string | number, any>;

interface PathWalkItem {
  depth: number;
  totalDepth: number;
  prop: string | number | null;
  rawProp: string;
  isArray: boolean;
}

interface PathParentResult {
  parent: AnyObject | any[] | undefined;
  parent_path: string;
  attr: string | number | null;
}

interface WalkCallback {
  (obj: any, pathArr: string[]): { skip?: boolean } | void;
}

interface ObjUtilInstance {
  obj: AnyObject;
  parent: (path: ObjectPath, force?: boolean) => PathParentResult;
  get: <T = any>(path: ObjectPath) => T | null;
  set: (path: ObjectPath, val: any, force?: boolean) => void;
  delete: (path: ObjectPath) => void;
  copy: () => AnyObject;
  walk: (callback: WalkCallback) => void;
}

function objPathJoin(basePath: string, ...paths: string[]): string {
  let pathArr = basePath.split('.');
  
  for (let path of paths) {
    while (path.substr(0, 1) === '.') {
      if (path.substr(0, 3) === '../') {
        path = path.substr(3);
        pathArr.pop();
      } else if (path.substr(0, 2) === './') {
        path = path.substr(2);
      } else {
        path = path.substr(1);
      }
    }
    pathArr = pathArr.concat(path.split('.'));
  }
  
  return pathArr.join('.');
}

function* pathWalk(path: ObjectPath): Generator<PathWalkItem> {
  let pa: string[];
  
  if (typeof path === 'string') {
    pa = path.split(/[\.\[]/g);
  } else {
    pa = path;
  }
  
  let depth = 0;
  const totalDepth = pa.length - 1;
  
  for (let rawProp of pa) {
    let isArray = false;
    let prop: string | number | null = rawProp;
    const len = rawProp.length;
    
    if (prop[len - 1] === "]") {
      if (prop === "]") {
        prop = null;
        rawProp = '[]';
        isArray = true;
      } else {
        try {
          const tmp_p = Number(prop.substring(0, len - 1));
          if (!isNaN(tmp_p)) {
            prop = tmp_p;
            rawProp = '[' + rawProp;
            isArray = true;
          }
        } catch (e) {
          console.log(e);
        }
      }
    }
    
    yield { depth, totalDepth, prop, rawProp, isArray };
    depth++;
  }
}

function objPath<T = any>(obj: AnyObject, path: ObjectPath): T | null {
  let tmp: any = obj;
  
  for (const { prop } of pathWalk(path)) {
    if (tmp !== undefined) {
      tmp = Reflect.get(tmp, prop as string | number);
    } else {
      return null;
    }
  }
  
  return tmp;
}

function objPathParent(obj: AnyObject, path: ObjectPath, force = false): PathParentResult {
  let attr: string | number | null;
  let parent: any = obj;
  let lastParent: any = obj;
  let parentProp: string | number | null = '';
  let parentPa: string[] = [];
  let parentPath = '';
  let makeParent = false;
  
  for (const { depth, totalDepth, prop, rawProp, isArray } of pathWalk(path)) {
    if (makeParent) {
      if (isArray) {
        parent = [];
      } else {
        parent = {};
      }
      
      if (Array.isArray(lastParent) && parentProp === null) {
        lastParent.push(parent);
      } else {
        Reflect.set(lastParent, parentProp as string | number, parent);
      }
      makeParent = false;
    }
    
    if (depth === totalDepth) {
      attr = prop;
    } else {
      parentPa.push(rawProp);
      lastParent = parent;
      
      if (parent !== undefined) {
        parent = Reflect.get(parent, prop as string | number);
      }
      
      if (parent === undefined) {
        if (force) {
          makeParent = true;
          parentProp = prop;
        }
      }
      
      if (isArray || parentPath === "") {
        parentPath += rawProp;
      } else {
        parentPath += "." + rawProp;
      }
    }
  }
  
  return { parent, parent_path: parentPath, attr: attr! };
}

function objPathSet(obj: AnyObject, path: ObjectPath, val: any, force = false): void {
  const { parent, attr } = objPathParent(obj, path, force);
  
  if (parent) {
    if (Array.isArray(parent) && attr === null) {
      parent.push(val);
    } else {
      Reflect.set(parent, attr as string | number, val);
    }
  }
}

function objPathDelete(obj: AnyObject, path: ObjectPath): void {
  const { parent, attr } = objPathParent(obj, path);
  
  if (parent) {
    Reflect.deleteProperty(parent, attr as string | number);
  }
}

function objMoveProp(obj: AnyObject, path: ObjectPath, step: number): AnyObject {
  if (step) {
    const { parent, attr } = objPathParent(obj, path, false);
    
    if (parent) {
      const children = Object.entries(parent);
      const keys = Object.keys(parent);
      const len = keys.length;
      
      const pos = keys.indexOf(attr as string);
      let target_pos = pos + step;
      
      if (target_pos < 0) {
        target_pos = 0;
      } else if (target_pos >= len) {
        target_pos = len - 1;
      }
      
      if (target_pos !== pos) {
        const tmp = children[target_pos];
        children[target_pos] = children[pos];
        children[pos] = tmp;
        
        for (let key of keys) {
          Reflect.deleteProperty(parent, key);
        }
        
        for (let [key, val] of children) {
          Reflect.set(parent, key, val);
        }
      }
    }
  }
  
  return obj;
}

function objCopy<T extends AnyObject>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function objWalk(obj: AnyObject, callback: WalkCallback): void {
  const tasks: Array<{ obj: any; pathArr: string[] }> = [{
    obj,
    pathArr: []
  }];
  
  while (tasks.length > 0) {
    const task = tasks.pop()!;
    const { obj: currentObj, pathArr } = task;
    
    if (currentObj) {
      let skip = false;
      const cbRes = callback(currentObj, pathArr);
      
      if (cbRes && cbRes.skip) {
        skip = true;
      }
      
      if (!skip) {
        for (const [prop, val] of Object.entries(currentObj)) {
          const subPathArr = pathArr.concat(prop);
          
          if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            tasks.push({
              obj: val,
              pathArr: subPathArr
            });
          } else {
            callback(val, subPathArr);
          }
        }
      }
    }
  }
}

const useObjUtil = (obj: AnyObject, inplace = true): ObjUtilInstance => {
  if (!inplace) {
    obj = objCopy(obj);
  }
  
  return {
    obj,
    parent: (path: ObjectPath, force?: boolean) => objPathParent(obj, path, force),
    get: <T = any>(path: ObjectPath) => objPath<T>(obj, path),
    set: (path: ObjectPath, val: any, force?: boolean) => objPathSet(obj, path, val, force),
    delete: (path: ObjectPath) => objPathDelete(obj, path),
    copy: () => objCopy(obj),
    walk: (callback: WalkCallback) => objWalk(obj, callback)
  };
};

// Export all functions and types
export {
  objPathJoin,
  objPath,
  objPathParent,
  objPathSet,
  objPathDelete,
  objMoveProp,
  objCopy,
  objWalk,
  useObjUtil,
  type ObjectPath,
  type AnyObject,
  type PathWalkItem,
  type PathParentResult,
  type WalkCallback,
  type ObjUtilInstance
};

// Default export for compatibility
export default {
  objPathJoin,
  objPath,
  objPathParent,
  objPathSet,
  objPathDelete,
  objMoveProp,
  objCopy,
  objWalk,
  useObjUtil
};