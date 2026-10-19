/* ride-core.js — EUC/VESC ride-log core (P6 microlib, P4 datum-only).
   Deterministic CSV parser + derived summary. Pure: no DOM, no deps, no randomness.
   Loaded as a classic script in the browser (window.RideCore) and by selftest.mjs
   through createRequire, so the page and the test run the SAME parser. */
(function (root) {
  'use strict';

  var COLUMNS = ['t_ms', 'erpm', 'current_a', 'duty', 'voltage_v', 'temp_c'];
  var SAMPLE_CSV = "t_ms,erpm,current_a,duty,voltage_v,temp_c\n0,0,62.0,0.300,64.40,34.00\n500,2,59.7,0.310,64.49,34.11\n1000,9,57.4,0.320,64.58,34.22\n1500,21,55.2,0.330,64.68,34.33\n2000,37,53.0,0.340,64.76,34.43\n2500,57,50.9,0.350,64.85,34.53\n3000,82,48.8,0.360,64.94,34.62\n3500,112,46.8,0.370,65.02,34.71\n4000,146,44.8,0.380,65.10,34.79\n4500,185,42.9,0.390,65.18,34.86\n5000,229,41.0,0.400,65.25,34.93\n5500,277,39.2,0.410,65.33,34.99\n6000,330,37.4,0.420,65.40,35.04\n6500,387,35.7,0.430,65.47,35.09\n7000,449,34.1,0.440,65.53,35.13\n7500,515,32.5,0.450,65.60,35.17\n8000,581,31.0,0.460,65.66,35.21\n8500,643,29.5,0.470,65.72,35.25\n9000,700,28.2,0.480,65.77,35.28\n9500,753,26.8,0.490,65.83,35.32\n10000,801,25.6,0.500,65.88,35.36\n10500,845,24.4,0.510,65.92,35.41\n11000,884,23.3,0.520,65.97,35.45\n11500,918,22.3,0.530,66.01,35.51\n12000,948,21.4,0.540,66.04,35.57\n12500,973,20.5,0.550,66.08,35.63\n13000,993,19.8,0.560,66.11,35.71\n13500,1009,19.1,0.570,66.13,35.79\n14000,1021,18.6,0.580,66.15,35.87\n14500,1028,18.2,0.590,66.16,35.97\n15000,1019,21.1,0.463,66.04,36.07\n15500,1019,21.9,0.456,66.00,36.17\n16000,1016,22.2,0.448,65.99,36.28\n16500,1011,21.9,0.440,66.00,36.39\n17000,1006,21.0,0.432,66.03,36.51\n17500,1006,19.7,0.424,66.09,36.62\n18000,1015,18.3,0.417,66.14,36.73\n18500,1029,17.0,0.413,66.19,36.84\n19000,1043,16.1,0.410,66.23,36.95\n19500,1051,15.8,0.410,66.24,37.05\n20000,1053,16.1,0.413,66.22,37.15\n20500,1049,16.9,0.417,66.19,37.24\n21000,1044,18.2,0.424,66.13,37.32\n21500,1042,19.6,0.432,66.07,37.40\n22000,1043,20.9,0.440,66.01,37.47\n22500,1045,21.8,0.448,65.97,37.53\n23000,1042,22.2,0.456,65.95,37.59\n23500,1034,22.0,0.463,65.96,37.64\n24000,1020,21.2,0.467,65.99,37.69\n24500,1007,20.0,0.470,66.04,37.73\n25000,1001,18.6,0.470,66.09,37.77\n25500,1002,17.3,0.467,66.15,37.81\n26000,1010,16.3,0.463,66.19,37.85\n26500,1020,15.8,0.456,66.20,37.89\n27000,1026,16.0,0.448,66.19,37.93\n27500,1028,16.7,0.440,66.16,37.98\n28000,1028,17.9,0.432,66.11,38.03\n28500,1030,19.3,0.424,66.05,38.09\n29000,1037,20.6,0.417,65.99,38.15\n29500,1048,21.6,0.413,65.94,38.22\n30000,1057,22.2,0.410,65.92,38.30\n30500,1061,22.1,0.410,65.92,38.38\n31000,1055,21.4,0.413,65.95,38.47\n31500,1044,20.2,0.417,65.99,38.57\n32000,1031,18.9,0.424,66.05,38.67\n32500,1022,17.5,0.432,66.10,38.78\n33000,1019,16.4,0.440,66.14,38.89\n33500,1020,15.9,0.448,66.17,39.00\n34000,1020,15.9,0.456,66.16,39.11\n34500,1017,16.5,0.463,66.13,39.23\n35000,1010,17.6,0.467,66.08,39.34\n35500,1005,19.0,0.470,66.02,39.45\n36000,1005,20.4,0.470,65.96,39.55\n36500,1013,21.5,0.467,65.92,39.66\n37000,1027,22.1,0.463,65.89,39.75\n37500,1041,22.1,0.456,65.88,39.84\n38000,1050,21.6,0.448,65.90,39.93\n38500,1052,20.5,0.440,65.95,40.00\n39000,1048,19.1,0.432,66.00,40.07\n39500,1044,17.8,0.424,66.06,40.14\n40000,1043,16.6,0.417,66.10,40.19\n40500,1044,15.9,0.413,66.13,40.24\n41000,1046,15.8,0.410,66.13,40.29\n41500,1044,16.4,0.410,66.11,40.34\n42000,1035,17.4,0.413,66.06,40.38\n42500,1021,18.7,0.417,66.00,40.42\n43000,1008,20.1,0.424,65.94,40.46\n43500,1001,21.3,0.432,65.89,40.50\n44000,1002,22.0,0.440,65.85,40.54\n44500,1010,22.2,0.448,65.85,40.59\n45000,1030,19.0,0.440,65.98,40.64\n45500,1028,21.2,0.448,65.88,40.64\n46000,1021,25.1,0.462,65.71,40.67\n46500,1010,30.2,0.481,65.50,40.73\n47000,996,36.0,0.502,65.25,40.82\n47500,978,42.4,0.525,64.98,40.95\n48000,959,49.3,0.550,64.69,41.11\n48500,937,56.4,0.576,64.39,41.29\n49000,914,63.6,0.602,64.08,41.50\n49500,890,70.8,0.628,63.78,41.73\n50000,865,77.9,0.654,63.48,41.98\n50500,840,84.6,0.679,63.19,42.25\n51000,816,91.0,0.702,62.92,42.53\n51500,793,96.9,0.723,62.67,42.82\n52000,771,102.3,0.743,62.44,43.13\n52500,752,106.9,0.760,62.25,43.44\n53000,734,110.8,0.774,62.08,43.75\n53500,720,113.9,0.785,61.95,44.07\n54000,709,116.2,0.793,61.85,44.38\n54500,702,117.5,0.798,61.79,44.69\n55000,700,118.0,0.800,61.77,45.00\n55500,702,117.5,0.798,61.79,45.30\n56000,707,116.2,0.793,61.84,45.59\n56500,715,113.9,0.785,61.93,45.87\n57000,726,110.8,0.774,62.06,46.14\n57500,739,106.9,0.760,62.22,46.40\n58000,754,102.3,0.743,62.41,46.65\n58500,770,96.9,0.723,62.64,46.89\n59000,788,91.0,0.702,62.88,47.11\n59500,806,84.6,0.679,63.15,47.32\n60000,825,77.9,0.654,63.43,47.51\n60500,844,70.8,0.628,63.72,47.70\n61000,862,63.6,0.602,64.02,47.86\n61500,880,56.4,0.576,64.32,48.02\n62000,896,49.3,0.550,64.62,48.15\n62500,911,42.4,0.525,64.91,48.28\n63000,924,36.0,0.502,65.17,48.38\n63500,935,30.2,0.481,65.42,48.47\n64000,943,25.1,0.462,65.62,48.54\n64500,948,21.2,0.448,65.79,48.59\n65000,950,8.0,0.260,66.34,48.62\n65500,950,8.0,0.260,66.34,48.70\n66000,951,7.9,0.259,66.34,48.79\n66500,952,7.7,0.258,66.34,48.87\n67000,953,7.6,0.257,66.35,48.97\n67500,955,7.3,0.256,66.36,49.06\n68000,957,7.0,0.254,66.36,49.16\n68500,959,6.7,0.252,66.38,49.26\n69000,961,6.3,0.250,66.39,49.35\n69500,964,5.9,0.247,66.40,49.45\n70000,967,5.5,0.244,66.42,49.53\n70500,970,5.0,0.241,66.44,49.62\n71000,974,4.5,0.238,66.45,49.70\n71500,977,4.0,0.235,66.47,49.77\n72000,981,3.5,0.232,66.49,49.84\n72500,985,2.9,0.228,66.51,49.90\n73000,989,2.4,0.225,66.54,49.95\n73500,993,1.8,0.221,66.56,50.00\n74000,997,1.2,0.217,66.58,50.04\n74500,1001,0.6,0.214,66.60,50.07\n75000,1005,0.0,0.210,66.63,50.11\n75500,1009,-0.6,0.206,66.65,50.13\n76000,1013,-1.2,0.203,66.67,50.16\n76500,1017,-1.8,0.199,66.69,50.18\n77000,1021,-2.4,0.195,66.71,50.20\n77500,1025,-2.9,0.192,66.74,50.23\n78000,1029,-3.5,0.188,66.76,50.25\n78500,1033,-4.0,0.185,66.78,50.29\n79000,1036,-4.5,0.182,66.80,50.32\n79500,1040,-5.0,0.179,66.81,50.36\n80000,1043,-5.5,0.176,66.83,50.41\n80500,1046,-5.9,0.173,66.85,50.46\n81000,1049,-6.3,0.170,66.86,50.52\n81500,1051,-6.7,0.168,66.87,50.59\n82000,1053,-7.0,0.166,66.89,50.66\n82500,1055,-7.3,0.164,66.89,50.74\n83000,1057,-7.6,0.163,66.90,50.83\n83500,1058,-7.7,0.162,66.91,50.91\n84000,1059,-7.9,0.161,66.91,51.01\n84500,1060,-8.0,0.160,66.91,51.10\n85000,1060,-24.0,-0.080,67.20,51.20\n85500,1055,-24.3,-0.083,67.20,51.24\n86000,1042,-25.0,-0.090,67.20,51.30\n86500,1021,-26.1,-0.100,67.20,51.36\n87000,992,-27.3,-0.112,67.20,51.42\n87500,957,-28.5,-0.125,67.20,51.50\n88000,917,-29.6,-0.137,67.20,51.57\n88500,871,-30.4,-0.148,67.20,51.64\n89000,821,-30.8,-0.156,67.20,51.72\n89500,767,-30.7,-0.160,67.20,51.79\n90000,710,-30.0,-0.161,67.20,51.85\n90500,651,-28.8,-0.158,67.20,51.92\n91000,591,-27.1,-0.150,67.20,51.98\n91500,530,-24.8,-0.139,67.20,52.03\n92000,469,-22.1,-0.124,67.20,52.09\n92500,409,-19.3,-0.108,67.20,52.13\n93000,350,-16.5,-0.092,67.20,52.17\n93500,293,-13.8,-0.077,67.11,52.21\n94000,239,-11.3,-0.063,67.00,52.25\n94500,189,-8.9,-0.050,66.90,52.28\n95000,143,-7.5,-0.042,66.84,52.31\n95500,103,-7.5,-0.042,66.84,52.33\n96000,68,-7.5,-0.042,66.83,52.35\n96500,39,-7.5,-0.042,66.83,52.37\n97000,18,-7.5,-0.042,66.83,52.38\n97500,5,-7.5,-0.042,66.83,52.39\n98000,0,-7.5,-0.042,66.83,52.40\n98500,0,0.0,0.000,66.51,52.41\n99000,0,0.0,0.000,66.50,52.42\n99500,0,0.0,0.000,66.50,52.44\n";
  var ROUND = {
    distance_m: 4, energy_wh: 4, regen_wh: 4, net_wh: 4,
    peak_current_a: 3, peak_temp_c: 3, regen_s: 3, duration_s: 3
  };
  var FORMULAS = {
    distance_m: 'D = SUM[ (v_i + v_i+1)/2 * dt_i ]  with v = erpm * C / 60   [m]  (pole pairs = 1)',
    energy_wh: 'E+ = SUM[ max( (P_i + P_i+1)/2 * dt_i , 0 ) / 3600 ]  with P = voltage_v * current_a   [Wh]',
    regen_wh: 'E- = SUM[ max( -(P_i + P_i+1)/2 * dt_i , 0 ) / 3600 ]  with P = voltage_v * current_a   [Wh]',
    net_wh: 'Enet = E+ - E-   [Wh]',
    peak_current_a: 'Ipk = max( current_a )   [A]',
    peak_temp_c: 'Tpk = max( temp_c )   [degC]',
    regen_s: 't_regen = SUM[ dt_i for every row i with current_a < 0 ]   [s]',
    duration_s: 'T = t_ms(last) - t_ms(first)   [ms -> s]',
    samples: 'N = count of parsed rows',
    speed: 'v = erpm * C / 60   [m/s]   x3.6 -> km/h   (C = wheel circumference, pole pairs = 1)'
  };

  function isNum(tok) {
    return tok !== '' && tok !== null && isFinite(Number(tok));
  }

  function fail(msg) {
    return { ok: false, error: msg, rows: null, header: false };
  }

  /* Parse CSV telemetry. Header row optional; when present it fixes column order.
     Rejects (never repairs, never NaN): empty input, missing columns, wrong field
     count, non-finite values, non-monotonic t_ms, duty outside [-1,1], voltage < 0,
     fewer than 2 rows. Errors name the offending line and column. */
  function parseCsv(text) {
    if (typeof text !== 'string') return fail('input is not text');
    var lines = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
    var idx = COLUMNS.slice();      // default: fixed column order
    var haveHeader = false;
    var seenHeader = false;
    var rows = [];

    for (var L = 0; L < lines.length; L++) {
      var raw = lines[L];
      var line = raw.trim();
      if (line === '' || line.charAt(0) === '#') continue;   // blank / comment
      var toks = line.split(',').map(function (f) { return f.trim(); });
      var lineNo = L + 1;

      var allText = toks.every(function (f) { return !isNum(f); });
      if (!seenHeader && allText) {                          // header line
        seenHeader = true;
        haveHeader = true;
        var map = {};
        for (var h = 0; h < toks.length; h++) map[toks[h].toLowerCase()] = h;
        for (var c = 0; c < COLUMNS.length; c++) {
          var key = COLUMNS[c];
          if (!Object.prototype.hasOwnProperty.call(map, key)) {
            return fail('line ' + lineNo + ': header is missing required column "' + key + '"');
          }
          idx[c] = map[key];
        }
        var width = toks.length;
        continue;
      }
      seenHeader = true;

      var width2 = haveHeader ? undefined : COLUMNS.length;
      if (width2 !== undefined && toks.length !== width2) {
        return fail('line ' + lineNo + ': expected ' + width2 + ' fields, got ' + toks.length);
      }
      if (haveHeader) {
        var maxIdx = Math.max.apply(null, idx);
        if (toks.length <= maxIdx) {
          return fail('line ' + lineNo + ': expected at least ' + (maxIdx + 1) +
            ' fields for the declared header, got ' + toks.length);
        }
      }

      var row = { t_ms: 0, erpm: 0, current_a: 0, duty: 0, voltage_v: 0, temp_c: 0, raw: [] };
      for (var c2 = 0; c2 < COLUMNS.length; c2++) {
        var name = COLUMNS[c2];
        var tok = toks[idx[c2]];
        if (!isNum(tok)) {
          return fail('line ' + lineNo + ': ' + name + ' value "' + tok + '" is not a finite number');
        }
        row[name] = Number(tok);
        row.raw[c2] = tok;
      }
      if (rows.length > 0 && row.t_ms < rows[rows.length - 1].t_ms) {
        return fail('line ' + lineNo + ': t_ms ' + row.raw[0] + ' goes backwards (' +
          row.t_ms + ' < ' + rows[rows.length - 1].t_ms + ')');
      }
      if (row.duty < -1 || row.duty > 1) {
        return fail('line ' + lineNo + ': duty ' + row.raw[3] + ' is outside [-1,1]' +
          ' (is duty logged in percent?)');
      }
      if (row.voltage_v < 0) {
        return fail('line ' + lineNo + ': voltage_v ' + row.raw[4] + ' is negative');
      }
      rows.push(row);
    }

    if (rows.length === 0) return fail('empty input: no data rows found');
    if (rows.length < 2) {
      return fail('only ' + rows.length + ' row: need at least 2 rows to derive anything');
    }
    return { ok: true, error: null, rows: rows, header: haveHeader };
  }

  function speedFromErpm(erpm, circ_m) {
    return (erpm * circ_m) / 60;                    // m/s, pole pairs = 1
  }

  /* Derived summary. Trapezoidal integration over consecutive rows; a row's own
     sign decides whether its outgoing interval counts as regen. Returns {ok:false}
     (never NaN) if the circumference is not a positive finite number. */
  function summarize(rows, opts) {
    opts = opts || {};
    var circ = Number(opts.circ_m === undefined ? 0.5 : opts.circ_m);
    if (!isFinite(circ) || circ <= 0) {
      var shown = isFinite(Number(opts.circ_m)) ? opts.circ_m : 'a non-numeric value';
      return { ok: false, error: 'wheel circumference must be a positive number (got ' + shown + ')' };
    }
    var n = rows.length;
    var distance_m = 0, energy_wh = 0, regen_wh = 0, regen_s = 0;
    for (var i = 0; i < n - 1; i++) {
      var a = rows[i], b = rows[i + 1];
      var dt = (b.t_ms - a.t_ms) / 1000;                      // s
      var vbar = ((speedFromErpm(a.erpm, circ) + speedFromErpm(b.erpm, circ)) / 2);
      distance_m += vbar * dt;
      var pbar = ((a.voltage_v * a.current_a) + (b.voltage_v * b.current_a)) / 2;  // W
      var seg = (pbar * dt) / 3600;                           // Wh
      if (seg > 0) energy_wh += seg; else regen_wh += -seg;
      if (a.current_a < 0) regen_s += dt;
    }
    var peak_current_a = rows[0].current_a, peak_temp_c = rows[0].temp_c;
    for (var j = 1; j < n; j++) {
      if (rows[j].current_a > peak_current_a) peak_current_a = rows[j].current_a;
      if (rows[j].temp_c > peak_temp_c) peak_temp_c = rows[j].temp_c;
    }
    return {
      ok: true, error: null, circ_m: circ, samples: n,
      duration_s: (rows[n - 1].t_ms - rows[0].t_ms) / 1000,
      distance_m: distance_m, energy_wh: energy_wh, regen_wh: regen_wh,
      net_wh: energy_wh - regen_wh,
      peak_current_a: peak_current_a, peak_temp_c: peak_temp_c, regen_s: regen_s
    };
  }

  function round(v, dp) { return Number(v.toFixed(dp)); }

  /* Canonical text of a summary at fixed precision -> content hash (FNV-1a 32).
     Same CSV + same circumference -> same tag, in node and in the browser. */
  function canonical(summary) {
    var parts = ['C=' + round(summary.circ_m, 6)];
    var keys = ['samples', 'duration_s', 'distance_m', 'energy_wh', 'regen_wh',
      'net_wh', 'peak_current_a', 'peak_temp_c', 'regen_s'];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var dp = ROUND[key];
      var v = summary[key];
      parts.push(key + '=' + (dp === undefined ? String(v) : round(v, dp).toFixed(dp)));
    }
    return parts.join('|');
  }

  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  function hashSummary(summary) { return fnv1a(canonical(summary)); }

  var api = {
    COLUMNS: COLUMNS, SAMPLE_CSV: SAMPLE_CSV, FORMULAS: FORMULAS,
    parseCsv: parseCsv, summarize: summarize, speedFromErpm: speedFromErpm,
    canonical: canonical, hashSummary: hashSummary
  };
  root.RideCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
