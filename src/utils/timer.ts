// import { logTimer } from './logging'

class Timer {
    globalTimer = 0
    #timers: Record<string, number> = {}

    public logDev(secondsElapsed: number, message: string): void {
        if (process.env.NODE_ENV !== 'development') return

        console.log(`${secondsElapsed}s: ${message}`)
        // logTimer({ seconds_elapsed: secondsElapsed }, message)
    }

    public startGlobalTimer(): void {
        this.globalTimer = new Date().getTime()
    }

    public globalElapsed(): number {
        return (new Date().getTime() - this.globalTimer) / 1000
    }

    public startTimer(key: string): void {
        this.#timers[key] = new Date().getTime()

        // this.debug(`${this.globalTimer ? `${this.globalElapsed()}s:` : ''} started loading ${key}`)
    }

    public stopTimer(key: string): number {
        const timerStart = this.#timers[key] || 0
        const elapsed = (new Date().getTime() - timerStart) / 1000
        delete this.#timers[key]

        this.logDev(elapsed, key)

        // this.logDev(`${this.globalTimer ? `${this.globalElapsed()}s:` : ''} ${key} took ${elapsed}s`)

        return elapsed
    }

    public time<T>(key: string, op: () => T): T {
        this.startTimer(key)
        const result = op()
        this.stopTimer(key)

        return result
    }
}

export default new Timer()
