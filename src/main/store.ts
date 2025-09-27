import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'

export class Store {
  private path: string
  private data: Record<string, any>

  constructor() {
    const userDataPath = app.getPath('userData')
    this.path = join(userDataPath, 'preferences.json')
    this.data = this.loadSync()
  }

  private loadSync(): Record<string, any> {
    try {
      const data = require('fs').readFileSync(this.path, 'utf-8')
      return JSON.parse(data)
    } catch {
      return {}
    }
  }

  async save(): Promise<void> {
    await fs.writeFile(this.path, JSON.stringify(this.data, null, 2), 'utf-8')
  }

  get(key: string, defaultValue?: any): any {
    return this.data[key] ?? defaultValue
  }

  set(key: string, value: any): void {
    this.data[key] = value
    this.save()
  }

  delete(key: string): void {
    delete this.data[key]
    this.save()
  }

  getAll(): Record<string, any> {
    return { ...this.data }
  }
}