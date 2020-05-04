const Logger = require('./logger');

/**
 * Handy object for scheduling events at intervals, etc.
 * @class
 * @constructor
 * @inner
 */
function Scheduler() {
    this.ScheduledEvents = [];
    this.schedulerInterval = 10;
    this.timerID = null;
    this.startTime = Date.now();
    this.eventsToRemove = []; // list to be handed on update cycle
    this.eventsToAdd = []; // list to be handed on update cycle
    this.eventsListeners = []; // subscribed listeners for add/remove events

    /**
     * Events: EventsCleared, EventAdded(event), EventRemoved(event)
     * @param {Object} listener Listener object with implemented listener methods to be called
     */
    this.addEventsListener = function (listener) {
        if (!this.eventsListeners.includes(listener))
            this.eventsListeners.push(listener);
    };

    this.removeEventsListener = function (listener) {
        this.eventsListeners = this.eventsListeners.filter(e => e !== listener);
    };

    this.clearEventsListeners = function () { this.eventsListeners = []; };

    /**
     * Clear all scheduled events.
     * */
    this.clearEvents = function () {
        this.ScheduledEvents = [];

        this.eventsListeners.map(listener => { if (listener.EventsCleared !== undefined) listener.EventsCleared(); });
    };

    /**
    * Schedule a function to run (and optionally repeat).
    * @param {Object} args Object with delay: ms offset to schedule this for, run: function, repeat: true/false whether to reschedule
    * @return {Object} event that was added for future use
    */
    this.scheduleEvent = function (args) {
        args.time = Date.now() - this.startTime;
        this.eventsToAdd.push(args);
        return args; // return event for further usage
    };

    /**
     * Remove an event using the name property of that event
     * @param {string} name of the event to remove
     */
    this.removeEventByName = function (name) {
        this.eventsToRemove.push(name);
    };

    /**
     * Get first event with matching name field
     * @param {String} name Name of this event
     * @returns {Task} event object
     */
    this.getEventByName = function (name) {
        return this.ScheduledEvents.find(e => e.name === name);
    };

    /**
     * Start the Scheduler running events.
     */
    this.startScheduler = function () {

        if (!this.timerID) {
            window.clearInterval(this.timerID);
        }

        Logger.log("scheduler starting at time: " + this.startTime);
        const me = this; //local reference for this closure

        function scheduler(nextTime) {
            const time = Date.now() - me.startTime; // in ms

            // remove old events
            me.eventsToRemove.map(name => {
                let event = null;
                while (event = me.ScheduledEvents.find(e => e.name == name)) {
                    if (event) {
                        me.ScheduledEvents = me.ScheduledEvents.filter(e => e !== event);
                        me.eventsListeners.map(listener => { if (listener.EventRemoved !== undefined) listener.EventRemoved(event); });
                    }
                }
            });
            me.eventsToRemove = [];

            // add any new events
            me.eventsToAdd.map(event => {
                if (!me.ScheduledEvents.includes(event)) {
                    me.ScheduledEvents.push(event);
                    me.eventsListeners.map(listener => { if (listener.EventAdded !== undefined) listener.EventAdded(event); });
                }
            });
            me.eventsToAdd = [];

            // run events 
            me.ScheduledEvents.filter(
                async event => {
                    if (event.running) return true; //quit if still running

                    let keep = true;
                    let tdiff = event.time - time;
                    if (tdiff < 1) {

                        //if (!event.system) Logger.log("running event at time:" + time);
                        // if we're behind, don't run this one...
                        //if (!event.ignorable && tdiff > -event.delay * 2) {
                        //if (!event.ignorable) {

                        event.running = true;
                        await event.run(event.time);


                        if (!event.system) me.eventsListeners.map(listener => { if (listener.EventRun !== undefined) listener.EventRun(event); });
                        //}
                        if (event.repeat) {
                            // try to keep to original time
                            // TODO: might be an issue if events run over in time!!
                            event.time = event.time + event.delay;
                            keep = true;
                        }
                        else {
                            keep = false;
                            me.eventsListeners.map(listener => { if (listener.EventRemoved !== undefined) listener.EventRemoved(event); });
                        }
                        event.running = false;
                    }
                    return keep;
                });
        };

        this.timerID = window.setInterval(scheduler, this.schedulerInterval);
    };
};

module.exports = Scheduler;