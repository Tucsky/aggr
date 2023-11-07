import { DBSchema } from "idb"
import { IndicatorSettings } from "@/store/panesSettings/chart"
import type { types as AlertsTypes } from '../alerts'
import type { GifsStorage, ImportedSound, Preset, ProductsStorage, Workspace } from "@/types/types"

interface  AlertsDBSchema extends DBSchema{ 
  alerts: {
   value: AlertsTypes.MarketAlert
   key: string
  }
 }

export interface AggrDBSchema extends AlertsDBSchema, DBSchema {
 colors: {
   value: string
   key: string
 }
 gifs: {
   value: GifsStorage
   key: string
 }
 indicators: {
   value: IndicatorSettings
   key: string
   indexes: { name: string }
 } 
 hotkeys: {
   value: string
   key: string
   indexes: { name: string}
 }
 presets: {
   value: Preset
   key: string
 }
 products: {
   value: ProductsStorage
   key: string
 }
 sounds: {
   value: ImportedSound
   key: string
 }
 workspaces: {
   value: Workspace
   key: string
   indexes: { name: string }
 }
}