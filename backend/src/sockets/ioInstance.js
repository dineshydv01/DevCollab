// WHAT: A tiny singleton holding a reference to the live Socket.IO
//       server instance, once it exists.
// WHY this needs to exist at all: `io` is created inside
//      initializeSocket() at server startup (sockets/index.js). REST
//      controllers and services (like notification.service.js) need
//      to emit real-time events too — e.g. "someone applied to your
//      project" happens over a plain HTTP POST, not a socket event,
//      but the OWNER should still get a real-time notification push.
//      Without this, there'd be no way for that REST code path to
//      reach the socket server at all.
// WHY a singleton instead of passing `io` through every function call:
//      threading `io` as a parameter through createApplication ->
//      createNotification -> every other service that might someday
//      need it would pollute a lot of function signatures with a
//      concern most of them don't otherwise care about. A singleton
//      set once at startup is a reasonable, contained trade-off here.

let ioInstance = null;

export function setIO(io) {
  ioInstance = io;
}

export function getIO() {
  return ioInstance;
}
