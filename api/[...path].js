"use strict";

// Vercel hanya membaca fungsi dari folder api/ di root project.
// Logika sebenarnya ada di musicnode/api/handler.js.
module.exports = require("../musicnode/api/handler.js");
