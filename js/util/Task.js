/**
 * Class for Scheduler tasks
 */
function Task() { }
Task.prototype = {
    name: "task",
    data: {},
    delay: 0,
    run: async () => { return true; },
    repeat: true,
    running: false,
    system: false
};

module.exports = Task;