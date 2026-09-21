
import { getOutboxevents, processEvents, type Event } from "./helper/events.js";




async function startOuboxEventsWorker() {
    while (true) {
        try {
            const events: Event[] = await getOutboxevents()
            if (events.length == 0) {
                await sleep(1000)
                continue
            }

            // process events
            console.log(events)
            for (let event of events) {
                const result = await processEvents(event)
                if (!result) {
                    continue
                }
            }
        } catch (error) {
            console.log(error)
            await sleep(2000)
        }
    }
}

const sleep = (ms: number) => {
    return new Promise((resolve, reject) => setTimeout(resolve, ms))
}

startOuboxEventsWorker()