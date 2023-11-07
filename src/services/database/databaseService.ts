import {AggrDBSchema} from './types' 
import { IDBPDatabase } from 'idb'

interface DatabaseServiceInterface {
  init: (db_name: string) => Promise<void>
}

export class DatabaseService implements DatabaseServiceInterface {
    db: IDBPDatabase<AggrDBSchema>
   constructor(){
    
   }

   async init(db_name) {
   }
 }