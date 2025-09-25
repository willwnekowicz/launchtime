import { homedir } from 'os'
import type { LaunchdTask } from '../../shared/types'

export class PlistBuilder {
  build(task: LaunchdTask): string {
    const plist: any = {
      Label: task.id,
      UserLabel: task.label,
      ProgramArguments: this.parseCommand(task.command)
    }

    if (task.workingDirectory) {
      plist.WorkingDirectory = this.expandPath(task.workingDirectory)
    }

    if (task.environmentVariables) {
      plist.EnvironmentVariables = task.environmentVariables
    }

    if (task.standardOutPath) {
      plist.StandardOutPath = this.expandPath(task.standardOutPath)
    }

    if (task.standardErrorPath) {
      plist.StandardErrorPath = this.expandPath(task.standardErrorPath)
    }

    this.addSchedule(plist, task.schedule)

    return this.toPlistXml(plist)
  }

  private parseCommand(command: string): string[] {
    const args: string[] = []
    let current = ''
    let inQuotes = false
    let quoteChar = ''

    for (let i = 0; i < command.length; i++) {
      const char = command[i]

      if ((char === '"' || char === "'") && (i === 0 || command[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true
          quoteChar = char
        } else if (char === quoteChar) {
          inQuotes = false
          quoteChar = ''
        } else {
          current += char
        }
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          args.push(current)
          current = ''
        }
      } else {
        current += char
      }
    }

    if (current) {
      args.push(current)
    }

    return args
  }

  private expandPath(path: string): string {
    // Expand ~ to home directory
    if (path.startsWith('~')) {
      return path.replace(/^~/, homedir())
    }
    return path
  }

  private addSchedule(plist: any, schedule: any): void {
    switch (schedule.type) {
      case 'interval':
        plist.StartInterval = schedule.interval
        break

      case 'calendar':
        const calendarInterval: any = {}
        if (schedule.calendar.minute !== undefined) calendarInterval.Minute = schedule.calendar.minute
        if (schedule.calendar.hour !== undefined) calendarInterval.Hour = schedule.calendar.hour
        if (schedule.calendar.day !== undefined) calendarInterval.Day = schedule.calendar.day
        if (schedule.calendar.weekday !== undefined) calendarInterval.Weekday = schedule.calendar.weekday
        if (schedule.calendar.month !== undefined) calendarInterval.Month = schedule.calendar.month
        plist.StartCalendarInterval = calendarInterval
        break

      case 'startup':
        plist.RunAtLoad = true
        break

      case 'watchPath':
        plist.WatchPaths = schedule.watchPaths
        break

      case 'manual':
      default:
        break
    }

    if (schedule.type !== 'startup' && schedule.type !== 'manual') {
      plist.KeepAlive = false
    }
  }

  private toPlistXml(obj: any): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n'
    xml += '<plist version="1.0">\n'
    xml += this.objectToXml(obj, 1)
    xml += '</plist>'
    return xml
  }

  private objectToXml(obj: any, indent: number): string {
    const indentStr = '    '.repeat(indent)
    let xml = `${indentStr}<dict>\n`

    for (const [key, value] of Object.entries(obj)) {
      xml += `${indentStr}    <key>${key}</key>\n`
      xml += this.valueToXml(value, indent + 1)
    }

    xml += `${indentStr}</dict>\n`
    return xml
  }

  private valueToXml(value: any, indent: number): string {
    const indentStr = '    '.repeat(indent)

    if (typeof value === 'string') {
      return `${indentStr}<string>${this.escapeXml(value)}</string>\n`
    } else if (typeof value === 'number') {
      return `${indentStr}<integer>${value}</integer>\n`
    } else if (typeof value === 'boolean') {
      return `${indentStr}<${value}/>\n`
    } else if (Array.isArray(value)) {
      let xml = `${indentStr}<array>\n`
      for (const item of value) {
        xml += this.valueToXml(item, indent + 1)
      }
      xml += `${indentStr}</array>\n`
      return xml
    } else if (typeof value === 'object' && value !== null) {
      return this.objectToXml(value, indent)
    }

    return ''
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}