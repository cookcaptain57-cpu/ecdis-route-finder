/* eslint-disable */
// src/Pages/NavigationBridgePage.jsx
// Navigation & Bridge — 15 reference tools
// ALL static data self-contained — no constants.js dependency
// APIs: Open-Meteo (weather, marine, sunrise) — no API key
//       Windy iframe embed — cyclone tracker
// IMPROVEMENTS v2:
//   1. Inline accordion — panel opens directly below its own card
//   2. GPS live location for Weather, Tide, Sunrise, Cyclone
//   3. Smooth CSS max-height expand animation
//   4. Auto-scroll to opened card
//   5. Only one card open at a time
//   6. useCallback on toggle — no unnecessary re-renders
//   7. useRef for scroll-to-card

import React, { useState, useCallback, useRef, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA — GMDSS STATIONS
// ─────────────────────────────────────────────────────────────────────────────
const GMDSS_STATIONS = [
  { id:"G001", name:"Mumbai MRCC",     region:"Indian Ocean",      country:"India",        seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"H", email:"mrccmumbai@indiancoastguard.gov.in", phone:"+91-22-22660000",  authority:"Indian Coast Guard" },
  { id:"G002", name:"Singapore MRSC",  region:"Malacca / SCS",     country:"Singapore",    seaArea:"A1/A2",    watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"W", email:"mrsc@mpa.gov.sg",                  phone:"+65-6325-2488",   authority:"MPA Singapore" },
  { id:"G003", name:"Dubai MRSC",      region:"Persian Gulf",       country:"UAE",          seaArea:"A1/A2",    watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"I", email:"mrsc@uaecoastguard.ae",            phone:"+971-4-2053400",  authority:"UAE Coast Guard" },
  { id:"G004", name:"Colombo MRCC",    region:"Indian Ocean",      country:"Sri Lanka",    seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"T", email:"mrcc@slcoastguard.lk",             phone:"+94-11-2421051",  authority:"Sri Lanka Coast Guard" },
  { id:"G005", name:"Shanghai MRCC",   region:"East China Sea",    country:"China",        seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"X", email:"shanghaimrcc@msa.gov.cn",          phone:"+86-21-65293100", authority:"China MSA" },
  { id:"G006", name:"Rotterdam MRCC",  region:"North Sea",         country:"Netherlands",  seaArea:"A1/A2",    watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"P", email:"mrcc@kustwacht.nl",                phone:"+31-223-542300",  authority:"Netherlands Coast Guard" },
  { id:"G007", name:"Falmouth MRCC",   region:"NE Atlantic",       country:"UK",           seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"K", email:"falmouthmrcc@hmcg.gov.uk",         phone:"+44-1326-317575", authority:"HM Coastguard" },
  { id:"G008", name:"Tokyo MRCC",      region:"NW Pacific",        country:"Japan",        seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"A", email:"kyunan@kaiho.mlit.go.jp",         phone:"+81-3-3591-6361", authority:"Japan Coast Guard" },
  { id:"G009", name:"Cape Town MRCC",  region:"South Atlantic",    country:"South Africa", seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"C", email:"mrcc@samsa.org.za",                phone:"+27-21-938-3300", authority:"SAMSA" },
  { id:"G010", name:"Mombasa MRSC",    region:"W Indian Ocean",    country:"Kenya",        seaArea:"A1/A2",    watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"V", email:"mrsc@kma.go.ke",                   phone:"+254-41-2313490", authority:"Kenya Maritime Authority" },
  { id:"G011", name:"Port Said MRCC",  region:"Mediterranean",     country:"Egypt",        seaArea:"A1/A2",    watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"E", email:"mrcc@nma.gov.eg",                  phone:"+20-66-3224000",  authority:"Egypt NMA" },
  { id:"G012", name:"Sydney MRCC",     region:"SW Pacific",        country:"Australia",    seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"S", email:"sydneymrcc@amsa.gov.au",           phone:"+61-2-9334-0200", authority:"AMSA" },
  { id:"G013", name:"Yokohama MRCC",   region:"NW Pacific",        country:"Japan",        seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"B", email:"yokohamaMRCC@kaiho.mlit.go.jp",   phone:"+81-45-211-1118", authority:"Japan Coast Guard 3rd Dist." },
  { id:"G014", name:"Houston MRCC",    region:"Gulf of Mexico",    country:"USA",          seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"G", email:"houstonmrcc@uscg.mil",             phone:"+1-713-671-5100", authority:"US Coast Guard Dist. 8" },
  { id:"G015", name:"Karachi MRCC",    region:"Arabian Sea",       country:"Pakistan",     seaArea:"A1/A2",    watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"J", email:"mrcc@pmsa.gov.pk",                 phone:"+92-21-99202142", authority:"Pakistan Maritime SA" },
];

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA — COAST STATIONS
// ─────────────────────────────────────────────────────────────────────────────
const COAST_STATIONS = [
  { id:"CS001", name:"Mumbai Radio",       callsign:"VWM",  country:"India",       vhfCh:"16, 26",     mfKhz:"2182, 2045",  hfMhz:"4, 8, 12, 16", services:"DSC, NAVTEX H, MSI, SAR" },
  { id:"CS002", name:"Singapore Radio",    callsign:"9VG",  country:"Singapore",   vhfCh:"16, 25, 28", mfKhz:"2182, 2625",  hfMhz:"4, 6, 8",      services:"DSC, NAVTEX W, MSI, Port Info" },
  { id:"CS003", name:"Dubai Radio",        callsign:"A6H",  country:"UAE",         vhfCh:"16, 67",     mfKhz:"2182",        hfMhz:"—",            services:"DSC, SAR, MSI" },
  { id:"CS004", name:"Portishead Radio",   callsign:"GKA",  country:"UK",          vhfCh:"16, 25, 28", mfKhz:"2182, 1869",  hfMhz:"4, 8, 12, 16", services:"DSC, MF/HF SAR, Fleet Msgs" },
  { id:"CS005", name:"Scheveningen Radio", callsign:"PCG",  country:"Netherlands", vhfCh:"16, 25, 27", mfKhz:"2182, 2824",  hfMhz:"4, 8, 12",     services:"DSC, NAVTEX P, SAR, MSI" },
  { id:"CS006", name:"Yokohama Radio",     callsign:"JOR",  country:"Japan",       vhfCh:"16, 23, 24", mfKhz:"2182, 2779",  hfMhz:"4, 8, 12, 16", services:"DSC, NAVTEX A, J3E, SAR" },
  { id:"CS007", name:"Sydney Radio",       callsign:"VIS",  country:"Australia",   vhfCh:"16, 23, 24", mfKhz:"2182, 2201",  hfMhz:"4, 8, 12",     services:"DSC, NAVTEX S, SAR, WEFAX" },
  { id:"CS008", name:"Cape Town Radio",    callsign:"ZSC",  country:"S. Africa",   vhfCh:"16, 25, 26", mfKhz:"2182, 3285",  hfMhz:"4, 8, 12",     services:"DSC, NAVTEX C, MSI, SAR" },
  { id:"CS009", name:"Karachi Radio",      callsign:"ASK",  country:"Pakistan",    vhfCh:"16, 24",     mfKhz:"2182, 2738",  hfMhz:"4, 8",         services:"DSC, SAR, MSI" },
  { id:"CS010", name:"Shanghai Radio",     callsign:"XSG",  country:"China",       vhfCh:"16, 23, 26", mfKhz:"2182, 2738",  hfMhz:"4, 8, 12, 16", services:"DSC, NAVTEX X, SAR, MSI" },
  { id:"CS011", name:"Port Said Radio",    callsign:"SUZ",  country:"Egypt",       vhfCh:"16, 25",     mfKhz:"2182",        hfMhz:"—",            services:"DSC, SAR, Canal info" },
  { id:"CS012", name:"Houston Radio",      callsign:"WOM",  country:"USA",         vhfCh:"16, 24, 28", mfKhz:"2182, 2670",  hfMhz:"4, 8, 12, 16", services:"DSC, NAVTEX G, SAR, MSI" },
  { id:"CS013", name:"Colombo Radio",      callsign:"4PB",  country:"Sri Lanka",   vhfCh:"16, 26",     mfKhz:"2182",        hfMhz:"—",            services:"DSC, SAR, MSI" },
  { id:"CS014", name:"Mombasa Radio",      callsign:"5ZM",  country:"Kenya",       vhfCh:"16, 22A",    mfKhz:"2182",        hfMhz:"—",            services:"DSC, SAR, MSI" },
  { id:"CS015", name:"Rotterdam Radio",    callsign:"PCR",  country:"Netherlands", vhfCh:"16, 23, 24", mfKhz:"2182, 3673",  hfMhz:"—",            services:"DSC, Port Authority, SAR" },
];

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA — VHF CHANNELS (ITU-R M.1084)
// ─────────────────────────────────────────────────────────────────────────────
const VHF_CHANNELS = [
  { ch:"06",  txShip:"156.300", txCoast:"156.300", mode:"Simplex", use:"Intership safety",                    notes:"Safety communications between vessels" },
  { ch:"08",  txShip:"156.400", txCoast:"156.400", mode:"Simplex", use:"Commercial — intership",              notes:"Commercial vessel working channel" },
  { ch:"09",  txShip:"156.450", txCoast:"156.450", mode:"Simplex", use:"Boater calling",                      notes:"Recreational boats calling channel (US)" },
  { ch:"10",  txShip:"156.500", txCoast:"156.500", mode:"Simplex", use:"Oil spill / OSC coordination",        notes:"Oil spill / On Scene Coordinator" },
  { ch:"11",  txShip:"156.550", txCoast:"156.550", mode:"Simplex", use:"VTS / Port operations",               notes:"Vessel Traffic Service working channel" },
  { ch:"12",  txShip:"156.600", txCoast:"156.600", mode:"Simplex", use:"Port operations / VTS",               notes:"Port coordination" },
  { ch:"13",  txShip:"156.650", txCoast:"156.650", mode:"Simplex", use:"Bridge-to-bridge safety (1W)",        notes:"Navigational safety, 1 watt max" },
  { ch:"14",  txShip:"156.700", txCoast:"156.700", mode:"Simplex", use:"Port operations",                     notes:"Port operations working channel" },
  { ch:"16",  txShip:"156.800", txCoast:"156.800", mode:"Simplex", use:"DISTRESS, SAFETY & CALLING",          notes:"PRIMARY WATCH CHANNEL — all vessels mandatory" },
  { ch:"17",  txShip:"156.850", txCoast:"156.850", mode:"Simplex", use:"State control — small vessels",       notes:"State control operations (1W)" },
  { ch:"20",  txShip:"157.000", txCoast:"161.600", mode:"Duplex",  use:"Port operations (duplex)",            notes:"Port operations duplex" },
  { ch:"22A", txShip:"157.100", txCoast:"157.100", mode:"Simplex", use:"USCG liaison",                        notes:"USCG-to-vessel working channel" },
  { ch:"24",  txShip:"157.200", txCoast:"161.800", mode:"Duplex",  use:"Public correspondence (duplex)",      notes:"Ship-to-shore telephone" },
  { ch:"25",  txShip:"157.250", txCoast:"161.850", mode:"Duplex",  use:"Public correspondence (duplex)",      notes:"Ship-to-shore telephone" },
  { ch:"26",  txShip:"157.300", txCoast:"161.900", mode:"Duplex",  use:"Public correspondence (duplex)",      notes:"Ship-to-shore telephone" },
  { ch:"27",  txShip:"157.350", txCoast:"161.950", mode:"Duplex",  use:"Public correspondence (duplex)",      notes:"Ship-to-shore telephone" },
  { ch:"28",  txShip:"157.400", txCoast:"162.000", mode:"Duplex",  use:"Public correspondence (duplex)",      notes:"Ship-to-shore telephone" },
  { ch:"67",  txShip:"156.375", txCoast:"156.375", mode:"Simplex", use:"Commercial / Coast Guard",            notes:"US — Bridge-to-bridge; UK — HM Coastguard" },
  { ch:"68",  txShip:"156.425", txCoast:"156.425", mode:"Simplex", use:"Recreational boating non-commercial", notes:"Pleasure craft working channel" },
  { ch:"69",  txShip:"156.475", txCoast:"156.475", mode:"Simplex", use:"Recreational boating non-commercial", notes:"Pleasure craft working channel" },
  { ch:"70",  txShip:"156.525", txCoast:"156.525", mode:"Simplex", use:"DSC DISTRESS / SAFETY ONLY",          notes:"DIGITAL SELECTIVE CALLING — NO VOICE" },
  { ch:"71",  txShip:"156.575", txCoast:"156.575", mode:"Simplex", use:"Recreational / commercial working",   notes:"Working channel" },
  { ch:"72",  txShip:"156.625", txCoast:"156.625", mode:"Simplex", use:"Recreational intership",              notes:"Non-commercial intership only" },
  { ch:"73",  txShip:"156.675", txCoast:"156.675", mode:"Simplex", use:"Port operations / intership",         notes:"Port / bridge working" },
  { ch:"77",  txShip:"156.875", txCoast:"156.875", mode:"Simplex", use:"Port operations intership",           notes:"Port working, no coast station" },
  { ch:"80A", txShip:"157.025", txCoast:"157.025", mode:"Simplex", use:"Commercial intership / Port ops",     notes:"US/UK commercial working, UK Marina Ch." },
  { ch:"87",  txShip:"157.375", txCoast:"161.975", mode:"Duplex",  use:"Public correspondence / AIS",        notes:"AIS channel 87B (161.975 MHz)" },
  { ch:"88",  txShip:"157.425", txCoast:"162.025", mode:"Duplex",  use:"Public correspondence / AIS",        notes:"AIS channel 88B (162.025 MHz)" },
];

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA — SAR CONTACTS
// ─────────────────────────────────────────────────────────────────────────────
const SAR_CONTACTS = [
  { id:"SAR001", name:"Indian Coast Guard MRCC Mumbai",    region:"Arabian Sea / Indian Ocean N",    country:"India",        phone:"+91-22-22660000",  email:"mrccmumbai@indiancoastguard.gov.in",  vhfCh:"16", mfKhz:"2182", website:"https://indiancoastguard.gov.in" },
  { id:"SAR002", name:"Indian Coast Guard MRCC Chennai",   region:"Bay of Bengal",                   country:"India",        phone:"+91-44-25362001",  email:"mrccchennai@indiancoastguard.gov.in", vhfCh:"16", mfKhz:"2182", website:"https://indiancoastguard.gov.in" },
  { id:"SAR003", name:"MPA Singapore MRSC",                region:"Malacca / South China Sea",       country:"Singapore",    phone:"+65-6325-2488",    email:"mrsc@mpa.gov.sg",                     vhfCh:"16", mfKhz:"2182", website:"https://www.mpa.gov.sg" },
  { id:"SAR004", name:"AMSA MRCC Canberra",                region:"Southern Ocean / SW Pacific",     country:"Australia",    phone:"+61-2-6279-5000",  email:"rccaus@amsa.gov.au",                  vhfCh:"16", mfKhz:"2182", website:"https://www.amsa.gov.au" },
  { id:"SAR005", name:"MRCC Falmouth (HM Coastguard)",     region:"NE Atlantic / English Channel",   country:"UK",           phone:"+44-1326-317575",  email:"falmouthmrcc@hmcg.gov.uk",            vhfCh:"16", mfKhz:"2182", website:"https://www.gov.uk/coastguard" },
  { id:"SAR006", name:"MRCC Japan (JCG Tokyo)",            region:"NW Pacific / Sea of Japan",       country:"Japan",        phone:"+81-3-3591-9809",  email:"kyunan@kaiho.mlit.go.jp",             vhfCh:"16", mfKhz:"2182", website:"https://www.kaiho.mlit.go.jp" },
  { id:"SAR007", name:"USMRCC Norfolk",                    region:"US East Coast / N Atlantic",      country:"USA",          phone:"+1-757-398-6700",  email:"norfolkmrcc@uscg.mil",                vhfCh:"16", mfKhz:"2182", website:"https://www.uscg.mil" },
  { id:"SAR008", name:"USMRCC San Francisco",              region:"US West Coast / N Pacific",       country:"USA",          phone:"+1-415-399-3547",  email:"sfmrcc@uscg.mil",                     vhfCh:"16", mfKhz:"2182", website:"https://www.uscg.mil" },
  { id:"SAR009", name:"SAMSA MRCC Cape Town",              region:"S Atlantic / SW Indian Ocean",    country:"South Africa", phone:"+27-21-938-3300",  email:"mrcc@samsa.org.za",                   vhfCh:"16", mfKhz:"2182", website:"https://www.samsa.org.za" },
  { id:"SAR010", name:"MRCC Netherlands (Den Helder)",     region:"North Sea",                       country:"Netherlands",  phone:"+31-223-542300",   email:"mrcc@kustwacht.nl",                   vhfCh:"16", mfKhz:"2182", website:"https://www.kustwacht.nl" },
  { id:"SAR011", name:"China MSA MRCC Shanghai",           region:"East China Sea / Yellow Sea",     country:"China",        phone:"+86-21-65293100",  email:"shanghaimrcc@msa.gov.cn",             vhfCh:"16", mfKhz:"2182", website:"https://www.msa.gov.cn" },
  { id:"SAR012", name:"MRCC Norway (Stavanger)",           region:"Norwegian Sea / N Atlantic",      country:"Norway",       phone:"+47-51-89-53-00",  email:"jrcc-nn@sdir.no",                     vhfCh:"16", mfKhz:"2182", website:"https://www.sjofartsdir.no" },
  { id:"SAR013", name:"MRCC Brazil (Rio de Janeiro)",      region:"South Atlantic",                  country:"Brazil",       phone:"+55-21-2104-6546", email:"mrcc@marinha.mil.br",                 vhfCh:"16", mfKhz:"2182", website:"https://www.marinha.mil.br" },
  { id:"SAR014", name:"MRCC Pakistan (Karachi)",           region:"Arabian Sea N",                   country:"Pakistan",     phone:"+92-21-99202142",  email:"mrcc@pmsa.gov.pk",                    vhfCh:"16", mfKhz:"2182", website:"https://www.pmsa.gov.pk" },
  { id:"SAR015", name:"UKMTO Dubai",                       region:"Persian Gulf / Arabian Sea",      country:"UAE/UK",       phone:"+971-50-552-3215", email:"watchkeeper@ukmto.org",               vhfCh:"16", mfKhz:"2182", website:"https://www.ukmto.org" },
  { id:"SAR016", name:"MRCC Italy (Rome)",                 region:"Central Mediterranean",           country:"Italy",        phone:"+39-06-5908-4448", email:"romemrtimecentre@mit.gov.it",         vhfCh:"16", mfKhz:"2182", website:"https://www.guardiacostiera.gov.it" },
  { id:"SAR017", name:"MRCC Greece (Piraeus)",             region:"Aegean / E Mediterranean",        country:"Greece",       phone:"+30-210-412-1250", email:"mrcc@hcg.gr",                         vhfCh:"16", mfKhz:"2182", website:"https://www.hcg.gr" },
  { id:"SAR018", name:"MRCC Canada (Halifax)",             region:"NW Atlantic / Canadian waters",   country:"Canada",       phone:"+1-902-427-8200",  email:"halifaxmrcc@dnd.ca",                  vhfCh:"16", mfKhz:"2182", website:"https://www.canada.ca/coastguard" },
];

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA — SIGNAL FLAGS
// ─────────────────────────────────────────────────────────────────────────────
const SIGNAL_FLAGS = [
  { letter:'A', phonetic:'Alpha',    meaning:'Diver down — keep clear, proceed slowly' },
  { letter:'B', phonetic:'Bravo',    meaning:'Dangerous cargo — explosives / flammables' },
  { letter:'C', phonetic:'Charlie',  meaning:'Yes / Affirmative' },
  { letter:'D', phonetic:'Delta',    meaning:'Keep clear — maneuvering with difficulty' },
  { letter:'E', phonetic:'Echo',     meaning:'Altering course to starboard' },
  { letter:'F', phonetic:'Foxtrot',  meaning:'Disabled — require assistance' },
  { letter:'G', phonetic:'Golf',     meaning:'Require a pilot' },
  { letter:'H', phonetic:'Hotel',    meaning:'Pilot on board' },
  { letter:'I', phonetic:'India',    meaning:'Altering course to port' },
  { letter:'J', phonetic:'Juliet',   meaning:'On fire — dangerous cargo, keep clear' },
  { letter:'K', phonetic:'Kilo',     meaning:'Wish to communicate' },
  { letter:'L', phonetic:'Lima',     meaning:'Stop your vessel instantly' },
  { letter:'M', phonetic:'Mike',     meaning:'My vessel is stopped, making no way' },
  { letter:'N', phonetic:'November', meaning:'No / Negative' },
  { letter:'O', phonetic:'Oscar',    meaning:'Man overboard' },
  { letter:'P', phonetic:'Papa',     meaning:'In port: about to sail. At sea: nets in water' },
  { letter:'Q', phonetic:'Quebec',   meaning:'Healthy — request free pratique' },
  { letter:'R', phonetic:'Romeo',    meaning:'(Reserved / no specific meaning at sea)' },
  { letter:'S', phonetic:'Sierra',   meaning:'Engines going astern' },
  { letter:'T', phonetic:'Tango',    meaning:'Keep clear — trawling' },
  { letter:'U', phonetic:'Uniform',  meaning:'You are standing into danger' },
  { letter:'V', phonetic:'Victor',   meaning:'Require assistance' },
  { letter:'W', phonetic:'Whiskey',  meaning:'Require medical assistance' },
  { letter:'X', phonetic:'X-ray',    meaning:'Stop your intentions, watch for signals' },
  { letter:'Y', phonetic:'Yankee',   meaning:'Dragging anchor' },
  { letter:'Z', phonetic:'Zulu',     meaning:'Require a tug' },
];

const FLAG_COLORS = {
  A:'linear-gradient(90deg,#1a6bcc 50%,#fff 50%)',
  B:'#cc0000',
  C:'linear-gradient(180deg,#1a6bcc 33%,#fff 33%,#fff 66%,#cc0000 66%)',
  D:'linear-gradient(90deg,#ffd700 50%,#1a4cb0 50%)',
  E:'linear-gradient(90deg,#cc0000 50%,#1a6bcc 50%)',
  F:'linear-gradient(180deg,#fff 50%,#cc0000 50%)',
  G:'linear-gradient(180deg,#ffd700 16%,#1a4cb0 16%,#1a4cb0 33%,#ffd700 33%,#ffd700 50%,#1a4cb0 50%,#1a4cb0 67%,#ffd700 67%)',
  H:'linear-gradient(90deg,#fff 50%,#cc0000 50%)',
  I:'linear-gradient(90deg,#ffd700 50%,#000 50%)',
  J:'linear-gradient(180deg,#1a6bcc 25%,#fff 25%,#fff 50%,#cc0000 50%,#cc0000 75%,#1a6bcc 75%)',
  K:'linear-gradient(90deg,#ffd700 50%,#1a6bcc 50%)',
  L:'linear-gradient(90deg,#ffd700 25%,#000 25%,#000 50%,#ffd700 50%,#ffd700 75%,#000 75%)',
  M:'linear-gradient(180deg,#1a6bcc 33%,#fff 33%)',
  N:'linear-gradient(90deg,#1a6bcc 25%,#fff 25%,#fff 50%,#1a6bcc 50%,#1a6bcc 75%,#fff 75%)',
  O:'linear-gradient(135deg,#cc0000 50%,#ffd700 50%)',
  P:'linear-gradient(90deg,#1a6bcc 20%,#fff 20%,#fff 80%,#1a6bcc 80%)',
  Q:'#ffd700',
  R:'#cc0000',
  S:'linear-gradient(180deg,#fff 50%,#1a6bcc 50%)',
  T:'linear-gradient(90deg,#cc0000 25%,#fff 25%,#fff 50%,#cc0000 50%,#cc0000 75%,#fff 75%)',
  U:'linear-gradient(90deg,#cc0000 50%,#fff 50%)',
  V:'linear-gradient(45deg,#fff 50%,#cc0000 50%)',
  W:'linear-gradient(180deg,#cc0000 33%,#fff 33%,#fff 66%,#1a6bcc 66%)',
  X:'linear-gradient(135deg,#fff 25%,#1a4cb0 25%,#1a4cb0 75%,#fff 75%)',
  Y:'linear-gradient(180deg,#ffd700 25%,#000 25%,#000 50%,#ffd700 50%)',
  Z:'linear-gradient(135deg,#000 25%,#ffd700 25%,#ffd700 75%,#000 75%)',
};

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA — MORSE CODE
// ─────────────────────────────────────────────────────────────────────────────
const MORSE = [
  {c:'A',m:'·—'},{c:'B',m:'—···'},{c:'C',m:'—·—·'},{c:'D',m:'—··'},
  {c:'E',m:'·'},{c:'F',m:'··—·'},{c:'G',m:'——·'},{c:'H',m:'····'},
  {c:'I',m:'··'},{c:'J',m:'·———'},{c:'K',m:'—·—'},{c:'L',m:'·—··'},
  {c:'M',m:'——'},{c:'N',m:'—·'},{c:'O',m:'———'},{c:'P',m:'·——·'},
  {c:'Q',m:'——·—'},{c:'R',m:'·—·'},{c:'S',m:'···'},{c:'T',m:'—'},
  {c:'U',m:'··—'},{c:'V',m:'···—'},{c:'W',m:'·——'},{c:'X',m:'—··—'},
  {c:'Y',m:'—·——'},{c:'Z',m:'——··'},
  {c:'0',m:'—————'},{c:'1',m:'·————'},{c:'2',m:'··———'},{c:'3',m:'···——'},
  {c:'4',m:'····—'},{c:'5',m:'·····'},{c:'6',m:'—····'},{c:'7',m:'——···'},
  {c:'8',m:'———··'},{c:'9',m:'————·'},
  {c:'SOS',m:'···———···',special:true},{c:'MOB',m:'——·——·——·',special:true},
];

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA — SMCP PHRASES
// ─────────────────────────────────────────────────────────────────────────────
const SMCP_PHRASES = [
  { cat:'Distress',   phrase:'MAYDAY MAYDAY MAYDAY',                  meaning:'Distress signal — vessel in grave & imminent danger' },
  { cat:'Distress',   phrase:'PAN-PAN PAN-PAN PAN-PAN',               meaning:'Urgency signal — safety of vessel or person' },
  { cat:'Distress',   phrase:'SECURITE SECURITE SECURITE',            meaning:'Safety signal — navigational or meteorological warning' },
  { cat:'Distress',   phrase:'I am abandoning my vessel',             meaning:'Crew leaving vessel in emergency' },
  { cat:'Distress',   phrase:'I require immediate assistance',        meaning:'Request for urgent help' },
  { cat:'Navigation', phrase:'I am altering my course to starboard',  meaning:'Course change to right' },
  { cat:'Navigation', phrase:'I am altering my course to port',       meaning:'Course change to left' },
  { cat:'Navigation', phrase:'I am not under command',                meaning:'Vessel unable to maneuver' },
  { cat:'Navigation', phrase:'I am restricted in my ability to maneuver', meaning:'Limited maneuverability' },
  { cat:'Navigation', phrase:'I am constrained by my draft',          meaning:'Deep draft vessel, limited sea room' },
  { cat:'Navigation', phrase:'I am engaged in fishing',               meaning:'Fishing vessel with gear out' },
  { cat:'Port Ops',   phrase:'Request permission to enter port',      meaning:'Vessel seeking port entry clearance' },
  { cat:'Port Ops',   phrase:'What is the state of the tide?',        meaning:'Requesting tidal information' },
  { cat:'Port Ops',   phrase:'I require a pilot',                     meaning:'Pilot boarding request' },
  { cat:'Port Ops',   phrase:'I require a tug',                       meaning:'Towage assistance request' },
  { cat:'Port Ops',   phrase:'I am ready to berth',                   meaning:'Vessel ready for berthing operations' },
  { cat:'Port Ops',   phrase:'What is the maximum draft allowed?',    meaning:'Depth restriction inquiry' },
  { cat:'SAR',        phrase:'I have a man overboard',                meaning:'Person fallen into water — MOB emergency' },
  { cat:'SAR',        phrase:'I require a helicopter',                meaning:'Medevac / SAR helicopter request' },
  { cat:'SAR',        phrase:'I require a doctor',                    meaning:'Medical assistance request' },
  { cat:'SAR',        phrase:'I am carrying out a SAR operation',     meaning:'Search and Rescue in progress' },
  { cat:'Weather',    phrase:'What is the weather forecast?',         meaning:'Request for meteorological information' },
  { cat:'Weather',    phrase:'I am encountering hurricane conditions', meaning:'Severe storm reporting' },
];

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA — PORT VHF GUIDE
// ─────────────────────────────────────────────────────────────────────────────
const PORT_VHF = [
  { port:'Singapore',       region:'Malacca / SE Asia',      work:['09','10','11','12','14'], vts:'VTS Singapore — Ch.10,12',  pilot:'Ch.14', emergency:'Ch.16' },
  { port:'Rotterdam',       region:'North Sea / Europe',     work:['11','13','14','19'],      vts:'Rotterdam VTS — Ch.11',     pilot:'Ch.09', emergency:'Ch.16' },
  { port:'Dubai/Jebel Ali', region:'Persian Gulf',           work:['09','13','14'],           vts:'Dubai VTS — Ch.09',         pilot:'Ch.12', emergency:'Ch.16' },
  { port:'Mumbai',          region:'Indian Ocean / W India', work:['08','11','12','14'],      vts:'Mumbai VTS — Ch.11',        pilot:'Ch.16', emergency:'Ch.16' },
  { port:'Shanghai',        region:'East China Sea',         work:['10','11','12','16'],      vts:'Shanghai VTS — Ch.11',      pilot:'Ch.14', emergency:'Ch.16' },
  { port:'Colombo',         region:'Indian Ocean',           work:['09','12','14'],           vts:'Colombo VTS — Ch.12',       pilot:'Ch.16', emergency:'Ch.16' },
  { port:'Hong Kong',       region:'South China Sea',        work:['12','14','22'],           vts:'HKVAS — Ch.12',             pilot:'Ch.22', emergency:'Ch.16' },
  { port:'Hamburg',         region:'North Sea / Europe',     work:['13','14','69','74'],      vts:'Elbe Traffic — Ch.69',      pilot:'Ch.16', emergency:'Ch.16' },
  { port:'Antwerp',         region:'North Sea / Europe',     work:['11','12','69'],           vts:'Zandvliet VTS — Ch.12',     pilot:'Ch.09', emergency:'Ch.16' },
  { port:'Fujairah',        region:'Gulf of Oman',           work:['08','09','12','14'],      vts:'Fujairah VTS — Ch.12',      pilot:'Ch.12', emergency:'Ch.16' },
  { port:'Busan',           region:'Yellow Sea / Korea',     work:['11','12','13','16'],      vts:'Busan VTS — Ch.12',         pilot:'Ch.16', emergency:'Ch.16' },
  { port:'New York',        region:'US East Coast',          work:['13','14','16'],           vts:'NY/NJ VTS — Ch.14',         pilot:'Ch.09', emergency:'Ch.16' },
  { port:'Los Angeles',     region:'US West Coast',          work:['12','14','22A'],          vts:'LA/LB VTS — Ch.14',         pilot:'Ch.14', emergency:'Ch.16' },
  { port:'Yokohama',        region:'Japan / Pacific',        work:['12','13','16'],           vts:'Tokyo Wan VTS — Ch.12',     pilot:'Ch.16', emergency:'Ch.16' },
  { port:'Port Said',       region:'Mediterranean / Suez',   work:['08','09','14','16'],      vts:'Suez Canal VTS — Ch.16',    pilot:'Ch.16', emergency:'Ch.16' },
  { port:'Cape Town',       region:'South Atlantic',         work:['08','12','14'],           vts:'Cape VTS — Ch.14',          pilot:'Ch.12', emergency:'Ch.16' },
  { port:'Mombasa',         region:'East Africa',            work:['08','12','16'],           vts:'Mombasa Port — Ch.12',      pilot:'Ch.16', emergency:'Ch.16' },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — haversine distance (NM)
// ─────────────────────────────────────────────────────────────────────────────
function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — GPS location hook (shared across panels)
// ─────────────────────────────────────────────────────────────────────────────
function useGPS() {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsErr,     setGpsErr]     = useState('');

  const getGPS = useCallback((onSuccess) => {
    if (!navigator.geolocation) {
      setGpsErr('GPS not supported by this browser/device.');
      return;
    }
    setGpsLoading(true);
    setGpsErr('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        onSuccess(
          pos.coords.latitude.toFixed(5),
          pos.coords.longitude.toFixed(5)
        );
      },
      (e) => {
        setGpsLoading(false);
        setGpsErr(
          e.code === 1 ? 'Location permission denied. Please allow access and retry.' :
          e.code === 2 ? 'Position unavailable. Check device GPS.' :
          'GPS timed out. Try again.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { gpsLoading, gpsErr, getGPS, setGpsErr };
}

// ─────────────────────────────────────────────────────────────────────────────
// GPS LOCATION BAR — reusable component shown in Weather/Tide/Sunrise/Cyclone
// ─────────────────────────────────────────────────────────────────────────────
function GpsBar({ lat, lon, setLat, setLon, onFetch, fetchLabel, gpsLoading, gpsErr, getGPS }) {
  return (
    <div>
      {/* Source toggle row */}
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <button
          style={{
            ...S.btnGps,
            background: gpsLoading ? 'rgba(40,120,60,0.4)' : 'linear-gradient(135deg,#1a6a3a,#0d4a2a)',
          }}
          onClick={() => getGPS((la, lo) => { setLat(la); setLon(lo); })}
          disabled={gpsLoading}
        >
          {gpsLoading ? '⏳ Getting GPS…' : '📍 Use My Live Location'}
        </button>
        <div style={{ fontSize:10, color:'#4a7a9b', alignSelf:'center' }}>
          — or enter manually below —
        </div>
      </div>

      {/* Manual inputs + fetch button */}
      <div style={S.row3}>
        <div>
          <label style={S.label}>Latitude</label>
          <input style={S.input} value={lat} onChange={e => setLat(e.target.value)} placeholder="e.g. 1.29" />
        </div>
        <div>
          <label style={S.label}>Longitude</label>
          <input style={S.input} value={lon} onChange={e => setLon(e.target.value)} placeholder="e.g. 103.85" />
        </div>
        <div style={{ display:'flex', alignItems:'flex-end' }}>
          <button style={S.btn} onClick={onFetch}>{fetchLabel}</button>
        </div>
      </div>

      {/* GPS coordinate confirmation badge */}
      {lat && lon && (
        <div style={{ fontSize:10, color:'#40c880', marginTop:4, letterSpacing:0.3 }}>
          📌 Coordinates: {parseFloat(lat).toFixed(4)}°, {parseFloat(lon).toFixed(4)}°
        </div>
      )}

      {/* GPS error */}
      {gpsErr && <div style={S.error}>{gpsErr}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight:'100vh',
    background:'linear-gradient(160deg,#0a1628 0%,#0d2240 40%,#091930 100%)',
    color:'#d0e8ff',
    fontFamily:"'Courier New','Courier',monospace",
    paddingBottom:60,
  },
  hero: {
    background:'linear-gradient(90deg,#0d2a4a,#1a3a6a)',
    borderBottom:'2px solid #1e5080',
    padding:'24px 28px 20px',
    display:'flex', alignItems:'center', gap:16,
  },
  heroTitle: { margin:0, fontSize:24, fontWeight:700, color:'#7ec8f5', letterSpacing:2, textTransform:'uppercase' },
  heroSub:   { margin:'4px 0 0', fontSize:12, color:'#4a8ab5', letterSpacing:1 },

  // ── Tool grid: single-column list so accordion works inline ──
  toolList: {
    display:'flex', flexDirection:'column',
    gap:0, padding:'16px 16px 0',
  },

  // ── Tool card header row ──
  toolCard: (active) => ({
    background: active
      ? 'linear-gradient(90deg,#1a3a5c,#0f2840)'
      : 'rgba(10,26,50,0.75)',
    border: active ? '1.5px solid #3a90d0' : '1px solid #1a3a5c',
    borderRadius: active ? '10px 10px 0 0' : 10,
    padding:'12px 14px',
    cursor:'pointer',
    display:'flex', alignItems:'center', gap:10,
    marginBottom: active ? 0 : 6,
    transition:'background 0.18s, border-color 0.18s',
    userSelect:'none',
  }),

  toolEmoji: { fontSize:20, minWidth:26 },
  toolLabel: { fontSize:12, fontWeight:700, color:'#a8d4f0', letterSpacing:0.5 },
  toolSub:   { fontSize:10, color:'#4a7a9b', marginTop:2 },

  // ── Inline accordion body ──
  accordionBody: (active) => ({
    background:'rgba(10,22,44,0.92)',
    border:'1.5px solid #3a90d0',
    borderTop:'none',
    borderRadius:'0 0 10px 10px',
    overflow:'hidden',
    maxHeight: active ? '9000px' : '0px',
    transition: active ? 'max-height 0.45s ease-in' : 'max-height 0.3s ease-out',
    marginBottom: active ? 8 : 0,
  }),

  accordionInner: { padding:'16px' },

  toolEmojiBig: { fontSize:18 },
  label: { fontSize:11, color:'#4a8ab5', display:'block', marginBottom:4, marginTop:10, letterSpacing:0.5 },
  input: {
    background:'rgba(255,255,255,0.06)', border:'1px solid #1e4a70',
    borderRadius:6, color:'#d0e8ff', padding:'8px 11px',
    fontSize:12, width:'100%', boxSizing:'border-box',
    fontFamily:"'Courier New',monospace",
  },
  select: {
    background:'#0a1e38', border:'1px solid #1e4a70',
    borderRadius:6, color:'#d0e8ff', padding:'8px 11px',
    fontSize:12, width:'100%', fontFamily:"'Courier New',monospace",
    cursor:'pointer',
  },
  btn: {
    background:'linear-gradient(135deg,#1a5a90,#0d3a6a)',
    border:'1px solid #3a90d0', borderRadius:7,
    color:'#7ec8f5', padding:'8px 16px',
    fontSize:12, cursor:'pointer', letterSpacing:0.5,
    fontFamily:"'Courier New',monospace", fontWeight:700,
    marginTop:10,
  },
  btnGps: {
    background:'linear-gradient(135deg,#1a6a3a,#0d4a2a)',
    border:'1px solid #3ad080', borderRadius:7,
    color:'#6ae8a0', padding:'8px 14px',
    fontSize:11, cursor:'pointer', letterSpacing:0.4,
    fontFamily:"'Courier New',monospace", fontWeight:700,
    display:'flex', alignItems:'center', gap:5,
  },
  btnSm: {
    background:'rgba(30,80,130,0.4)', border:'1px solid #2a6090',
    borderRadius:5, color:'#90c8e8', padding:'4px 10px',
    fontSize:10, cursor:'pointer', fontFamily:"'Courier New',monospace",
  },
  result: {
    background:'rgba(0,200,150,0.07)', border:'1px solid #1a6050',
    borderRadius:8, padding:'12px 14px', marginTop:12,
    fontSize:12, lineHeight:1.7, color:'#a0e8c0',
  },
  info: {
    background:'rgba(30,100,200,0.08)', border:'1px solid #1a4a70',
    borderRadius:8, padding:'10px 13px', marginBottom:12,
    fontSize:11, color:'#80c8e8', lineHeight:1.6,
  },
  error: {
    background:'rgba(200,50,50,0.1)', border:'1px solid #6a2020',
    borderRadius:8, padding:'10px 13px', marginTop:8,
    fontSize:11, color:'#f08080',
  },
  table: { width:'100%', borderCollapse:'collapse', fontSize:11 },
  th: {
    background:'rgba(20,60,100,0.5)', color:'#7ec8f5',
    padding:'7px 9px', textAlign:'left',
    borderBottom:'1px solid #1e4070', letterSpacing:0.4,
    whiteSpace:'nowrap',
  },
  td: { padding:'6px 9px', borderBottom:'1px solid rgba(30,70,110,0.3)', color:'#b0d4f0' },
  badge: (color) => ({
    display:'inline-block', background:`${color}22`, border:`1px solid ${color}55`,
    borderRadius:4, padding:'1px 7px', fontSize:10, color:color,
  }),
  tag: {
    display:'inline-block', background:'rgba(30,90,160,0.3)',
    border:'1px solid #2a5a90', borderRadius:4,
    padding:'1px 7px', fontSize:10, color:'#7eb8d8',
    marginRight:3, marginBottom:2,
  },
  row2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 },
  row3: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 },
  searchBox: {
    background:'rgba(255,255,255,0.05)', border:'1px solid #1e4a70',
    borderRadius:6, color:'#d0e8ff', padding:'7px 11px',
    fontSize:12, width:'100%', boxSizing:'border-box',
    fontFamily:"'Courier New',monospace", marginBottom:10,
  },
  spinner: { color:'#4a8ab5', fontSize:12, padding:'16px 0', textAlign:'center' },
};

// ─────────────────────────────────────────────────────────────────────────────
// TOOL DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
const TOOLS = [
  { id:'gmdss',     emoji:'📡', label:'GMDSS Station Directory',   sub:'15 global MRCC stations' },
  { id:'coast',     emoji:'🏔️', label:'Coast Station Directory',   sub:'Callsigns, freqs & services' },
  { id:'vhf',       emoji:'📻', label:'VHF Channel Guide',         sub:'ITU-R M.1084 full table' },
  { id:'vhfport',   emoji:'⚓', label:'VHF by Port / Region',     sub:'Working channels by port' },
  { id:'sar',       emoji:'🆘', label:'SAR Contact Directory',     sub:'Global MRCC/MRSC contacts' },
  { id:'flags',     emoji:'🚩', label:'Maritime Signal Flags',     sub:'A–Z flag meanings & colours' },
  { id:'smcp',      emoji:'💬', label:'SMCP Reference',            sub:'Standard phrases by category' },
  { id:'morse',     emoji:'·—', label:'Morse Code Reference',      sub:'Encode / decode + table' },
  { id:'weather',   emoji:'🌦️', label:'Weather Forecast',         sub:'Live forecast — GPS or manual' },
  { id:'cyclone',   emoji:'🌀', label:'Cyclone Tracker',           sub:'Live cyclone tracking — GPS centred' },
  { id:'tide',      emoji:'🌊', label:'Tide / Wave Data',          sub:'Live marine data — GPS or manual' },
  { id:'sunrise',   emoji:'🌅', label:'Sunrise / Sunset',         sub:'7-day solar — GPS or manual' },
  { id:'conditions',emoji:'🌡️', label:'Current Weather & Sea State', sub:'Live conditions — GPS or manual' },
  { id:'anchor',    emoji:'⚓', label:'Anchor Gear Calculator',    sub:'Scope, radius, chain weight' },
  { id:'radius',    emoji:'📐', label:'Safe Anchorage Radius',     sub:'Swinging circle planner' },
  { id:'milestone', emoji:'🏁', label:'Voyage Milestone Tracker',  sub:'Multi-leg ETA calculator' },
  { id:'wxroute',   emoji:'🗺️', label:'Ship Weather Routing Map',  sub:'Live GPS · ECDIS route · DR predictions · Weather' },
];

// ─────────────────────────────────────────────────────────────────────────────
// PANEL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function GmdssPanel() {
  const [q, setQ] = useState('');
  const data = GMDSS_STATIONS.filter(s =>
    !q || [s.name,s.country,s.region,s.authority].join(' ').toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div>
      <input style={S.searchBox} placeholder="Search by name, country, region…" value={q} onChange={e=>setQ(e.target.value)} />
      <div style={{overflowX:'auto'}}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Station / Authority</th><th style={S.th}>Country</th>
            <th style={S.th}>Sea Area</th><th style={S.th}>Watch Freq</th>
            <th style={S.th}>DSC Freq</th><th style={S.th}>NAVTEX</th><th style={S.th}>Phone</th>
          </tr></thead>
          <tbody>{data.map(s=>(
            <tr key={s.id}>
              <td style={S.td}><b style={{color:'#7ec8f5'}}>{s.name}</b><br/><span style={{color:'#4a7a9b',fontSize:10}}>{s.authority}</span></td>
              <td style={S.td}>{s.country}</td>
              <td style={S.td}><span style={S.badge('#4aa8e8')}>{s.seaArea}</span></td>
              <td style={S.td}><code style={{fontSize:10}}>{s.watchFreq}</code></td>
              <td style={S.td}><code style={{fontSize:10}}>{s.dsrFreq}</code></td>
              <td style={S.td}><span style={S.badge('#e8a840')}>{s.navtexId}</span></td>
              <td style={S.td}><a href={`tel:${s.phone}`} style={{color:'#6ad0a0',fontSize:10}}>{s.phone}</a></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function CoastPanel() {
  const [q, setQ] = useState('');
  const data = COAST_STATIONS.filter(s =>
    !q || [s.name,s.callsign,s.country,s.services].join(' ').toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div>
      <input style={S.searchBox} placeholder="Search by name, callsign, country…" value={q} onChange={e=>setQ(e.target.value)} />
      <div style={{overflowX:'auto'}}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Station</th><th style={S.th}>Callsign</th>
            <th style={S.th}>VHF Ch</th><th style={S.th}>MF kHz</th>
            <th style={S.th}>HF MHz</th><th style={S.th}>Services</th>
          </tr></thead>
          <tbody>{data.map(s=>(
            <tr key={s.id}>
              <td style={S.td}><b style={{color:'#7ec8f5'}}>{s.name}</b><br/><span style={{fontSize:10,color:'#4a7a9b'}}>{s.country}</span></td>
              <td style={S.td}><code style={{color:'#e8d040'}}>{s.callsign}</code></td>
              <td style={S.td}><code style={{fontSize:10}}>Ch.{s.vhfCh}</code></td>
              <td style={S.td}><code style={{fontSize:10}}>{s.mfKhz}</code></td>
              <td style={S.td}><code style={{fontSize:10}}>{s.hfMhz}</code></td>
              <td style={S.td}>{s.services.split(', ').map((sv,i)=><span key={i} style={S.tag}>{sv}</span>)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function VhfPanel() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const data = VHF_CHANNELS.filter(c => {
    const matchQ = !q || [c.ch,c.use,c.notes].join(' ').toLowerCase().includes(q.toLowerCase());
    const matchF = filter==='all' || (filter==='distress'&&(c.ch==='16'||c.ch==='70')) || (filter===c.mode);
    return matchQ && matchF;
  });
  return (
    <div>
      <div style={S.row2}>
        <input style={{...S.searchBox,marginBottom:0}} placeholder="Search channel or use…" value={q} onChange={e=>setQ(e.target.value)} />
        <select style={{...S.select,marginBottom:0}} value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">All channels</option>
          <option value="distress">Distress / Safety only</option>
          <option value="Simplex">Simplex only</option>
          <option value="Duplex">Duplex only</option>
        </select>
      </div>
      <div style={{marginTop:10,overflowX:'auto'}}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Ch</th><th style={S.th}>Ship TX (MHz)</th>
            <th style={S.th}>Coast TX (MHz)</th><th style={S.th}>Mode</th>
            <th style={S.th}>Primary Use</th><th style={S.th}>Notes</th>
          </tr></thead>
          <tbody>{data.map(c=>{
            const isD = c.ch==='16'||c.ch==='70';
            return (
              <tr key={c.ch} style={{background:isD?'rgba(255,50,50,0.07)':''}}>
                <td style={S.td}><b style={{color:isD?'#ff8080':'#e8d040',fontSize:13}}>CH {c.ch}</b></td>
                <td style={S.td}><code>{c.txShip}</code></td>
                <td style={S.td}><code>{c.txCoast}</code></td>
                <td style={S.td}><span style={S.badge(c.mode==='Duplex'?'#a040e8':'#40a8e8')}>{c.mode}</span></td>
                <td style={{...S.td,color:isD?'#ff9090':'#b0d4f0',fontWeight:isD?700:400}}>{c.use}</td>
                <td style={{...S.td,fontSize:10,color:'#4a7a9b'}}>{c.notes}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

function VhfPortPanel() {
  const [q, setQ] = useState('');
  const data = PORT_VHF.filter(p =>
    !q || [p.port,p.region].join(' ').toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div>
      <input style={S.searchBox} placeholder="Search port or region…" value={q} onChange={e=>setQ(e.target.value)} />
      <div style={{overflowX:'auto'}}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Port</th><th style={S.th}>Region</th>
            <th style={S.th}>Working Ch.</th><th style={S.th}>VTS / Traffic</th>
            <th style={S.th}>Pilot</th><th style={S.th}>Emergency</th>
          </tr></thead>
          <tbody>{data.map((p,i)=>(
            <tr key={i}>
              <td style={S.td}><b style={{color:'#7ec8f5'}}>{p.port}</b></td>
              <td style={{...S.td,fontSize:10,color:'#4a7a9b'}}>{p.region}</td>
              <td style={S.td}>{p.work.map(ch=><span key={ch} style={S.tag}>Ch.{ch}</span>)}</td>
              <td style={{...S.td,fontSize:10}}>{p.vts}</td>
              <td style={S.td}><span style={S.badge('#40c8a8')}>{p.pilot}</span></td>
              <td style={S.td}><span style={S.badge('#ff6060')}>{p.emergency}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function SarPanel() {
  const [q, setQ] = useState('');
  const data = SAR_CONTACTS.filter(s =>
    !q || [s.name,s.country,s.region].join(' ').toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div>
      <input style={S.searchBox} placeholder="Search by name, country, region…" value={q} onChange={e=>setQ(e.target.value)} />
      <div style={{overflowX:'auto'}}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>MRCC / MRSC</th><th style={S.th}>Region</th>
            <th style={S.th}>Phone</th><th style={S.th}>VHF</th>
            <th style={S.th}>MF kHz</th><th style={S.th}>Contact</th>
          </tr></thead>
          <tbody>{data.map(s=>(
            <tr key={s.id}>
              <td style={S.td}><b style={{color:'#7ec8f5'}}>{s.name}</b><br/><span style={{fontSize:10,color:'#4a7a9b'}}>{s.country}</span></td>
              <td style={{...S.td,fontSize:10}}>{s.region}</td>
              <td style={S.td}><a href={`tel:${s.phone}`} style={{color:'#6ad0a0',fontSize:10}}>{s.phone}</a></td>
              <td style={S.td}><span style={S.badge('#ff6060')}>Ch.{s.vhfCh}</span></td>
              <td style={S.td}><code style={{fontSize:10}}>{s.mfKhz} kHz</code></td>
              <td style={{...S.td,fontSize:10}}>
                <a href={`mailto:${s.email}`} style={{color:'#7eb8f8',display:'block'}}>{s.email}</a>
                {s.website && <a href={s.website} target="_blank" rel="noreferrer" style={{color:'#4a8ab5'}}>🌐 web</a>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function FlagsPanel() {
  const [q, setQ] = useState('');
  const data = SIGNAL_FLAGS.filter(f =>
    !q || f.letter.toLowerCase()===q.toLowerCase() ||
    f.phonetic.toLowerCase().includes(q.toLowerCase()) ||
    f.meaning.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div>
      <input style={S.searchBox} placeholder="Search letter, phonetic or meaning…" value={q} onChange={e=>setQ(e.target.value)} />
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:9}}>
        {data.map(f=>(
          <div key={f.letter} style={{background:'rgba(10,30,60,0.6)',border:'1px solid #1e3a60',borderRadius:8,padding:10,display:'flex',gap:10,alignItems:'flex-start'}}>
            <div style={{
              width:42,height:34,borderRadius:4,flexShrink:0,
              background:FLAG_COLORS[f.letter]||'#1a4cb0',
              border:'1px solid #2a5a90',
              display:'flex',alignItems:'center',justifyContent:'center',
            }}>
              <span style={{color:'#fff',fontWeight:900,fontSize:13,textShadow:'0 1px 3px #000'}}>{f.letter}</span>
            </div>
            <div>
              <div style={{color:'#7ec8f5',fontWeight:700,fontSize:12}}>{f.letter} — {f.phonetic}</div>
              <div style={{color:'#b0d4f0',fontSize:10,marginTop:2,lineHeight:1.4}}>{f.meaning}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SmcpPanel() {
  const cats = ['All',...[...new Set(SMCP_PHRASES.map(p=>p.cat))]];
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const data = SMCP_PHRASES.filter(p =>
    (cat==='All'||p.cat===cat) &&
    (!q||p.phrase.toLowerCase().includes(q.toLowerCase())||p.meaning.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div>
      <div style={S.row2}>
        <input style={{...S.searchBox,marginBottom:0}} placeholder="Search phrase or meaning…" value={q} onChange={e=>setQ(e.target.value)} />
        <select style={S.select} value={cat} onChange={e=>setCat(e.target.value)}>
          {cats.map(c=><option key={c}>{c}</option>)}
        </select>
      </div>
      <div style={{marginTop:10,overflowX:'auto'}}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Category</th><th style={S.th}>Standard Phrase</th><th style={S.th}>Meaning</th>
          </tr></thead>
          <tbody>{data.map((p,i)=>(
            <tr key={i}>
              <td style={S.td}><span style={S.badge(p.cat==='Distress'?'#ff6060':p.cat==='SAR'?'#ff9040':'#40a8e8')}>{p.cat}</span></td>
              <td style={{...S.td,color:'#e8d040',fontStyle:'italic'}}>"{p.phrase}"</td>
              <td style={{...S.td,fontSize:10}}>{p.meaning}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function MorsePanel() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [mode, setMode] = useState('encode');
  const encode = t => t.toUpperCase().split('').map(ch=>{
    const f=MORSE.find(m=>m.c===ch); return f?f.m:(ch===' '?'/':'?');
  }).join(' ');
  const decode = t => t.trim().split('/').map(w=>
    w.trim().split(' ').map(code=>{const f=MORSE.find(m=>m.m===code);return f?f.c:'?';}).join('')
  ).join(' ');
  return (
    <div>
      <div style={S.row2}>
        <select style={S.select} value={mode} onChange={e=>{setMode(e.target.value);setResult('');}}>
          <option value="encode">Text → Morse</option>
          <option value="decode">Morse → Text</option>
        </select>
        <button style={{...S.btn,marginTop:0}} onClick={()=>setResult(mode==='encode'?encode(input):decode(input))}>Convert</button>
      </div>
      <label style={S.label}>{mode==='encode'?'Enter text:':'Enter morse (· — spaces between chars, / between words):'}</label>
      <input style={S.input} value={input} onChange={e=>setInput(e.target.value)}
        placeholder={mode==='encode'?'e.g. SOS':'e.g. ··· --- ···'} />
      {result && <div style={S.result}><b style={{color:'#7ec8f5'}}>Result:</b><br/><code style={{fontSize:14,letterSpacing:3}}>{result}</code></div>}
      <div style={{marginTop:18}}>
        <div style={{color:'#4a8ab5',fontSize:11,marginBottom:8,letterSpacing:0.5}}>QUICK REFERENCE</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))',gap:5}}>
          {MORSE.map(m=>(
            <div key={m.c} style={{background:m.special?'rgba(255,100,50,0.1)':'rgba(10,30,60,0.5)',border:`1px solid ${m.special?'#a04020':'#1e3a60'}`,borderRadius:6,padding:'5px 7px',textAlign:'center'}}>
              <div style={{color:m.special?'#ff9060':'#e8d040',fontWeight:700,fontSize:12}}>{m.c}</div>
              <div style={{color:'#7ec8f5',fontSize:11,letterSpacing:2,marginTop:1}}>{m.m}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── WEATHER — GPS + manual ────────────────────────────────────────────────────
function WeatherPanel() {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const { gpsLoading, gpsErr, getGPS, setGpsErr } = useGPS();

  const WMO = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Icing fog',51:'Light drizzle',53:'Moderate drizzle',55:'Dense drizzle',61:'Slight rain',63:'Moderate rain',65:'Heavy rain',71:'Slight snow',73:'Moderate snow',75:'Heavy snow',80:'Slight showers',81:'Moderate showers',82:'Violent showers',95:'Thunderstorm',96:'T-storm+hail',99:'T-storm+heavy hail'};

  const doFetch = async (la, lo) => {
    const useLat = la || lat;
    const useLon = lo || lon;
    if (!useLat || !useLon) { setErr('Enter or detect coordinates first.'); return; }
    setLoading(true); setErr(''); setData(null);
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${useLat}&longitude=${useLon}&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation,weathercode,visibility&wind_speed_unit=kn&forecast_days=5&timezone=UTC`);
      const j = await r.json();
      if (j.error) throw new Error(j.reason);
      setData(j);
    } catch { setErr('Failed to fetch weather. Check coordinates.'); }
    setLoading(false);
  };

  return (
    <div>
      <GpsBar
        lat={lat} lon={lon} setLat={setLat} setLon={setLon}
        onFetch={() => doFetch()}
        fetchLabel="Get Forecast"
        gpsLoading={gpsLoading} gpsErr={gpsErr}
        getGPS={(onSuccess) => getGPS((la, lo) => { setLat(la); setLon(lo); onSuccess && onSuccess(la, lo); })}
      />
      {loading && <div style={S.spinner}>⏳ Fetching weather data…</div>}
      {err && <div style={S.error}>{err}</div>}
      {data?.hourly && (
        <div style={{marginTop:12,overflowX:'auto'}}>
          <div style={{...S.info,marginBottom:8}}>Next 48 hours — wind in knots, temp °C, UTC</div>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Time (UTC)</th><th style={S.th}>Condition</th>
              <th style={S.th}>Temp °C</th><th style={S.th}>Wind kn</th>
              <th style={S.th}>Dir</th><th style={S.th}>Precip mm</th><th style={S.th}>Vis</th>
            </tr></thead>
            <tbody>{data.hourly.time.slice(0,48).map((t,i)=>{
              const ws = data.hourly.windspeed_10m[i];
              const wc = ws>34?'#ff4040':ws>17?'#ffaa40':ws>7?'#ffd700':'#40d880';
              return (
                <tr key={i}>
                  <td style={S.td}><code style={{fontSize:10}}>{t.replace('T',' ')}</code></td>
                  <td style={S.td}>{WMO[data.hourly.weathercode[i]]||'—'}</td>
                  <td style={S.td}>{data.hourly.temperature_2m[i]}°</td>
                  <td style={{...S.td,color:wc,fontWeight:700}}>{ws}</td>
                  <td style={S.td}>{data.hourly.winddirection_10m[i]}°</td>
                  <td style={S.td}>{data.hourly.precipitation[i]}</td>
                  <td style={S.td}>{data.hourly.visibility[i]!=null?(data.hourly.visibility[i]/1000).toFixed(1)+'km':'—'}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── CYCLONE TRACKER — GPS centred Windy + manual fallback ────────────────────
function CyclonePanel() {
  const [lat, setLat] = useState('15');
  const [lon, setLon] = useState('85');
  const [zoom, setZoom] = useState('3');
  const [windyUrl, setWindyUrl] = useState(
    'https://embed.windy.com/embed2.html?lat=15&lon=85&zoom=3&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=kt&metricTemp=%C2%B0C&radarRange=-1'
  );
  const { gpsLoading, gpsErr, getGPS } = useGPS();

  const buildUrl = (la, lo, zm) =>
    `https://embed.windy.com/embed2.html?lat=${la}&lon=${lo}&zoom=${zm}&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=kt&metricTemp=%C2%B0C&radarRange=-1`;

  const applyLocation = (la, lo) => {
    setLat(la); setLon(lo);
    setWindyUrl(buildUrl(la, lo, zoom));
  };

  return (
    <div>
      <div style={S.info}>Live cyclone / tropical storm tracking — active storms, forecast tracks &amp; intensity.</div>

      {/* GPS + manual controls */}
      <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap',alignItems:'flex-end'}}>
        <button
          style={{...S.btnGps, background: gpsLoading?'rgba(40,120,60,0.4)':'linear-gradient(135deg,#1a6a3a,#0d4a2a)'}}
          onClick={() => getGPS(applyLocation)}
          disabled={gpsLoading}
        >
          {gpsLoading ? '⏳ Getting GPS…' : '📍 Centre on My Location'}
        </button>
      </div>

      <div style={{...S.row3, marginBottom:10}}>
        <div>
          <label style={S.label}>Latitude</label>
          <input style={S.input} value={lat} onChange={e=>setLat(e.target.value)} placeholder="15" />
        </div>
        <div>
          <label style={S.label}>Longitude</label>
          <input style={S.input} value={lon} onChange={e=>setLon(e.target.value)} placeholder="85" />
        </div>
        <div>
          <label style={S.label}>Zoom (1–12)</label>
          <input style={S.input} value={zoom} onChange={e=>setZoom(e.target.value)} placeholder="3" />
        </div>
      </div>

      <button style={{...S.btn,marginTop:0,marginBottom:12}} onClick={() => setWindyUrl(buildUrl(lat,lon,zoom))}>
        🗺 Update Map
      </button>

      {gpsErr && <div style={S.error}>{gpsErr}</div>}

      {lat && lon && (
        <div style={{fontSize:10,color:'#40c880',marginBottom:8}}>
          📌 Map centred: {parseFloat(lat).toFixed(4)}°, {parseFloat(lon).toFixed(4)}°
        </div>
      )}

      <div style={{borderRadius:10,overflow:'hidden',border:'1.5px solid #1e4070'}}>
        <iframe
          key={windyUrl}
          title="Cyclone Tracker"
          src={windyUrl}
          style={{width:'100%',height:500,border:'none',display:'block'}}
          allowFullScreen
        />
      </div>
      <div style={{marginTop:8,fontSize:10,color:'#4a7a9b'}}>
        💡 Switch overlay to <b style={{color:'#7eb8d8'}}>Waves</b>, <b style={{color:'#7eb8d8'}}>Rain</b> or <b style={{color:'#7eb8d8'}}>Cyclone tracks</b> using the map layer menu.
      </div>
    </div>
  );
}

// ── TIDE / WAVE — GPS + manual ────────────────────────────────────────────────
function TidePanel() {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const { gpsLoading, gpsErr, getGPS } = useGPS();

  const doFetch = async () => {
    if (!lat || !lon) { setErr('Enter or detect coordinates first.'); return; }
    setLoading(true); setErr(''); setData(null);
    try {
      const r = await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=swell_wave_height,wave_height,wave_period,wave_direction&forecast_days=3&timezone=UTC`);
      const j = await r.json();
      if (j.error) throw new Error(j.reason);
      setData(j);
    } catch { setErr('No marine data for this location. Try open-sea or coastal coordinates.'); }
    setLoading(false);
  };

  return (
    <div>
      <div style={S.info}>ℹ️ Wave &amp; swell data for open sea / coastal locations. For precise tidal prediction consult ADMIRALTY TotalTide or port tide tables.</div>
      <GpsBar
        lat={lat} lon={lon} setLat={setLat} setLon={setLon}
        onFetch={doFetch}
        fetchLabel="Get Wave Data"
        gpsLoading={gpsLoading} gpsErr={gpsErr}
        getGPS={(onSuccess) => getGPS((la, lo) => { setLat(la); setLon(lo); onSuccess && onSuccess(la, lo); })}
      />
      {loading && <div style={S.spinner}>⏳ Fetching marine data…</div>}
      {err && <div style={S.error}>{err}</div>}
      {data?.hourly && (
        <div style={{marginTop:12,overflowX:'auto'}}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Time (UTC)</th><th style={S.th}>Wave Ht (m)</th>
              <th style={S.th}>Swell Ht (m)</th><th style={S.th}>Period (s)</th><th style={S.th}>Direction</th>
            </tr></thead>
            <tbody>{data.hourly.time.slice(0,48).map((t,i)=>(
              <tr key={i}>
                <td style={S.td}><code style={{fontSize:10}}>{t.replace('T',' ')}</code></td>
                <td style={S.td}>{data.hourly.wave_height?.[i]??'—'}</td>
                <td style={S.td}>{data.hourly.swell_wave_height?.[i]??'—'}</td>
                <td style={S.td}>{data.hourly.wave_period?.[i]??'—'}</td>
                <td style={S.td}>{data.hourly.wave_direction?.[i]??'—'}°</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── SUNRISE / SUNSET — GPS + manual ──────────────────────────────────────────
function SunrisePanel() {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const { gpsLoading, gpsErr, getGPS } = useGPS();

  const fmt = s => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return `${h}h ${m}m`; };

  const doFetch = async () => {
    if (!lat || !lon) { setErr('Enter or detect coordinates first.'); return; }
    setLoading(true); setErr(''); setData(null);
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max&timezone=UTC&forecast_days=7`);
      const j = await r.json();
      if (j.error) throw new Error(j.reason);
      setData(j);
    } catch { setErr('Failed to fetch solar data. Check coordinates.'); }
    setLoading(false);
  };

  return (
    <div>
      <GpsBar
        lat={lat} lon={lon} setLat={setLat} setLon={setLon}
        onFetch={doFetch}
        fetchLabel="Get Solar Data"
        gpsLoading={gpsLoading} gpsErr={gpsErr}
        getGPS={(onSuccess) => getGPS((la, lo) => { setLat(la); setLon(lo); onSuccess && onSuccess(la, lo); })}
      />
      {loading && <div style={S.spinner}>⏳ Fetching solar data…</div>}
      {err && <div style={S.error}>{err}</div>}
      {data?.daily && (
        <div style={{marginTop:12,overflowX:'auto'}}>
          <div style={{...S.info,marginBottom:8}}>7-day solar data — all times UTC</div>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Date</th><th style={S.th}>Sunrise UTC</th>
              <th style={S.th}>Sunset UTC</th><th style={S.th}>Daylight</th>
              <th style={S.th}>Sunshine</th><th style={S.th}>UV Max</th>
            </tr></thead>
            <tbody>{data.daily.time.map((t,i)=>(
              <tr key={i}>
                <td style={S.td}><b style={{color:'#e8d040'}}>{t}</b></td>
                <td style={S.td}><span style={{color:'#ffb040'}}>🌅 {data.daily.sunrise[i]?.split('T')[1]}</span></td>
                <td style={S.td}><span style={{color:'#4080ff'}}>🌇 {data.daily.sunset[i]?.split('T')[1]}</span></td>
                <td style={S.td}>{fmt(data.daily.daylight_duration[i])}</td>
                <td style={S.td}>{fmt(data.daily.sunshine_duration[i])}</td>
                <td style={S.td}><span style={S.badge(data.daily.uv_index_max[i]>7?'#ff4040':data.daily.uv_index_max[i]>4?'#ffaa40':'#40d880')}>{data.daily.uv_index_max[i]}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── CURRENT WEATHER & SEA STATE — GPS + manual, table format, device local time ──
// True & Relative wind computed from auto-tracked COG/SOG (two GPS fixes via watchPosition)
function ConditionsPanel() {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [weather, setWeather] = useState(null);
  const [marine, setMarine] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [fetchedAt, setFetchedAt] = useState(null);
  const [cog, setCog] = useState(null);
  const [sog, setSog] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [trackErr, setTrackErr] = useState('');
  const [copied, setCopied] = useState(false);
  const watchIdRef = useRef(null);
  const firstFixRef = useRef(null);
  const { gpsLoading, gpsErr, getGPS } = useGPS();

  // ── FULL WMO Present Weather (ww) code table — from WMO No.306 / Beaufort image ──
  const WW_CODES = {
    0:  { code:'00', desc:'Cloud development not observed or not observable', group:'Change of Sky in Last Hour' },
    1:  { code:'01', desc:'Clouds dissolving or becoming less developed', group:'Change of Sky in Last Hour' },
    2:  { code:'02', desc:'State of sky on the whole unchanged', group:'Change of Sky in Last Hour' },
    3:  { code:'03', desc:'Clouds forming or developing', group:'Change of Sky in Last Hour' },
    4:  { code:'04', desc:'Visibility reduced by smoke or volcanic ash', group:'Haze, Dust, Sand or Smoke' },
    5:  { code:'05', desc:'Haze', group:'Haze, Dust, Sand or Smoke' },
    10: { code:'10', desc:'Mist (visibility 1000m or more)', group:'Shallow Fog or Mist' },
    11: { code:'11', desc:'Shallow fog in patches', group:'Shallow Fog or Mist' },
    12: { code:'12', desc:'Shallow fog, more or less continuous, not deeper than 10m at sea', group:'Shallow Fog or Mist' },
    13: { code:'13', desc:'Lightning visible, no thunder heard', group:'Phenomena Within Sight but not at Station' },
    14: { code:'14', desc:'Precipitation within sight, not reaching ground or sea surface', group:'Phenomena Within Sight but not at Station' },
    15: { code:'15', desc:'Precipitation beyond 3 miles, reaching surface', group:'Phenomena Within Sight but not at Station' },
    16: { code:'16', desc:'Precipitation within 3 miles, reaching surface', group:'Phenomena Within Sight but not at Station' },
    17: { code:'17', desc:'Thunderstorm audible during the 10 min preceding but no precipitation at time of observation', group:'Thunder' },
    18: { code:'18', desc:'Squalls within sight', group:'Phenomena Within Last Hour' },
    19: { code:'19', desc:'Funnel cloud(s) / tornado / waterspout at or within sight of ship', group:'Phenomena Within Last Hour' },
    20: { code:'20', desc:'Drizzle (not freezing) or snow grains — not in showers (within last hour, not at time of obs)', group:'Phenomena Within Last Hour but not at Time of Obs' },
    21: { code:'21', desc:'Rain (not freezing) — within last hour, not at time of observation', group:'Phenomena Within Last Hour but not at Time of Obs' },
    22: { code:'22', desc:'Snow — within last hour, not at time of observation', group:'Phenomena Within Last Hour but not at Time of Obs' },
    23: { code:'23', desc:'Rain and snow, or ice pellets — within last hour, not at time of obs', group:'Phenomena Within Last Hour but not at Time of Obs' },
    24: { code:'24', desc:'Freezing drizzle or freezing rain — within last hour, not at time of obs', group:'Phenomena Within Last Hour but not at Time of Obs' },
    25: { code:'25', desc:'Shower(s) of rain — within last hour, not at time of observation', group:'Phenomena Within Last Hour but not at Time of Obs' },
    26: { code:'26', desc:'Shower(s) of snow or rain and snow — within last hour, not at time of obs', group:'Phenomena Within Last Hour but not at Time of Obs' },
    27: { code:'27', desc:'Shower(s) of hail, or rain and hail — within last hour, not at time of obs', group:'Phenomena Within Last Hour but not at Time of Obs' },
    28: { code:'28', desc:'Fog (visibility less than 1000m) in last hour but not at time of observation', group:'Phenomena Within Last Hour but not at Time of Obs' },
    29: { code:'29', desc:'Thunderstorm (with or without precipitation) — within last hour, not at time of obs', group:'Phenomena Within Last Hour but not at Time of Obs' },
    40: { code:'40', desc:'Fog at a distance at time of observation but not at ship', group:'Fog at Time of Observation' },
    41: { code:'41', desc:'Fog in patches', group:'Fog at Time of Observation' },
    42: { code:'42', desc:'Fog, sky discernible, thinning during last hour', group:'Fog at Time of Observation' },
    43: { code:'43', desc:'Fog, sky not discernible, thinning during last hour', group:'Fog at Time of Observation' },
    44: { code:'44', desc:'Fog, sky discernible, unchanged during last hour', group:'Fog at Time of Observation' },
    45: { code:'45', desc:'Fog, sky not discernible, unchanged during last hour', group:'Fog at Time of Observation' },
    46: { code:'46', desc:'Fog, sky discernible, beginning or becoming thicker', group:'Fog at Time of Observation' },
    47: { code:'47', desc:'Fog, sky not discernible, beginning or becoming thicker', group:'Fog at Time of Observation' },
    48: { code:'48', desc:'Fog, depositing rime, sky discernible', group:'Fog at Time of Observation' },
    49: { code:'49', desc:'Fog, depositing rime, sky not discernible', group:'Fog at Time of Observation' },
    50: { code:'50', desc:'Drizzle, slight, intermittent — not freezing', group:'Drizzle' },
    51: { code:'51', desc:'Drizzle, slight, continuous — not freezing', group:'Drizzle' },
    52: { code:'52', desc:'Drizzle, moderate, intermittent — not freezing', group:'Drizzle' },
    53: { code:'53', desc:'Drizzle, moderate, continuous — not freezing', group:'Drizzle' },
    54: { code:'54', desc:'Drizzle, dense, intermittent — not freezing', group:'Drizzle' },
    55: { code:'55', desc:'Drizzle, dense, continuous — not freezing', group:'Drizzle' },
    56: { code:'56', desc:'Drizzle, slight, freezing', group:'Drizzle' },
    57: { code:'57', desc:'Drizzle, moderate or dense, freezing', group:'Drizzle' },
    58: { code:'58', desc:'Drizzle and rain, slight', group:'Drizzle' },
    59: { code:'59', desc:'Drizzle and rain, moderate or dense', group:'Drizzle' },
    60: { code:'60', desc:'Rain, slight, intermittent — not freezing', group:'Rain' },
    61: { code:'61', desc:'Rain, slight, continuous — not freezing', group:'Rain' },
    62: { code:'62', desc:'Rain, moderate, intermittent — not freezing', group:'Rain' },
    63: { code:'63', desc:'Rain, moderate, continuous — not freezing', group:'Rain' },
    64: { code:'64', desc:'Rain, heavy, intermittent — not freezing', group:'Rain' },
    65: { code:'65', desc:'Rain, heavy, continuous — not freezing', group:'Rain' },
    66: { code:'66', desc:'Rain, slight, freezing', group:'Rain' },
    67: { code:'67', desc:'Rain (or drizzle and rain), moderate or heavy, freezing', group:'Rain' },
    68: { code:'68', desc:'Rain or drizzle and snow, slight', group:'Rain' },
    69: { code:'69', desc:'Rain or drizzle and snow, moderate or heavy', group:'Rain' },
    70: { code:'70', desc:'Intermittent fall of snowflakes, slight', group:'Solid Precipitation, Not in Showers' },
    71: { code:'71', desc:'Continuous fall of snowflakes, slight', group:'Solid Precipitation, Not in Showers' },
    72: { code:'72', desc:'Intermittent fall of snowflakes, moderate', group:'Solid Precipitation, Not in Showers' },
    73: { code:'73', desc:'Continuous fall of snowflakes, moderate', group:'Solid Precipitation, Not in Showers' },
    74: { code:'74', desc:'Intermittent fall of snowflakes, heavy', group:'Solid Precipitation, Not in Showers' },
    75: { code:'75', desc:'Continuous fall of snowflakes, heavy', group:'Solid Precipitation, Not in Showers' },
    76: { code:'76', desc:'Ice prisms (with or without fog)', group:'Solid Precipitation, Not in Showers' },
    77: { code:'77', desc:'Snow grains (with or without fog)', group:'Solid Precipitation, Not in Showers' },
    78: { code:'78', desc:'Isolated starlike snow crystals (with or without fog)', group:'Solid Precipitation, Not in Showers' },
    79: { code:'79', desc:'Ice pellets', group:'Solid Precipitation, Not in Showers' },
    80: { code:'80', desc:'Rain shower(s), slight', group:'Showery Precipitation' },
    81: { code:'81', desc:'Rain shower(s), moderate or heavy', group:'Showery Precipitation' },
    82: { code:'82', desc:'Rain shower(s), violent', group:'Showery Precipitation' },
    83: { code:'83', desc:'Shower(s) of rain and snow mixed, slight', group:'Showery Precipitation' },
    84: { code:'84', desc:'Shower(s) of rain and snow mixed, moderate or heavy', group:'Showery Precipitation' },
    85: { code:'85', desc:'Snow shower(s), slight', group:'Showery Precipitation' },
    86: { code:'86', desc:'Snow shower(s), moderate or heavy', group:'Showery Precipitation' },
    87: { code:'87', desc:'Shower(s) of soft or small hail (with or without rain)', group:'Showery Precipitation' },
    88: { code:'88', desc:'Shower(s) of soft or small hail, moderate or heavy', group:'Showery Precipitation' },
    89: { code:'89', desc:'Shower(s) of hail (with or without rain), not associated with thunder, slight', group:'Showery Precipitation' },
    90: { code:'90', desc:'Shower(s) of hail, moderate or heavy, not associated with thunder', group:'Showery Precipitation' },
    91: { code:'91', desc:'Slight rain at time of observation — thunderstorm in preceding hour', group:'Thunderstorm' },
    92: { code:'92', desc:'Moderate or heavy rain at time of observation — thunderstorm in preceding hour', group:'Thunderstorm' },
    93: { code:'93', desc:'Slight snow, or rain and snow mixed — thunderstorm in preceding hour', group:'Thunderstorm' },
    94: { code:'94', desc:'Moderate or heavy snow, or rain and snow mixed — thunderstorm in preceding hour', group:'Thunderstorm' },
    95: { code:'95', desc:'Thunderstorm, slight or moderate, without hail, but with rain and/or snow', group:'Thunderstorm at Time of Observation' },
    96: { code:'96', desc:'Thunderstorm, slight or moderate, with hail', group:'Thunderstorm at Time of Observation' },
    97: { code:'97', desc:'Thunderstorm, heavy, without hail', group:'Thunderstorm at Time of Observation' },
    98: { code:'98', desc:'Thunderstorm combined with duststorm or sandstorm', group:'Thunderstorm at Time of Observation' },
    99: { code:'99', desc:'Thunderstorm, heavy, with hail', group:'Thunderstorm at Time of Observation' },
  };

  // ── WMO Beaufort full table ──
  const BF_TABLE = [
    { n:0,  kn:'<1',    ms:'0–0.2',   mph:'<1',    desc:'Calm',           sea:'Calm (glassy)',   ds:0, waveM:'0',      crest:'—' },
    { n:1,  kn:'1–3',   ms:'0.3–1.5', mph:'1–3',   desc:'Light Air',      sea:'Calm (rippled)',  ds:1, waveM:'0.1',    crest:'Ripples, no foam crests' },
    { n:2,  kn:'4–6',   ms:'1.6–3.3', mph:'4–7',   desc:'Light Breeze',   sea:'Smooth',          ds:2, waveM:'0.1–0.5',crest:'Small wavelets, glassy crests' },
    { n:3,  kn:'7–10',  ms:'3.4–5.4', mph:'8–12',  desc:'Gentle Breeze',  sea:'Slight',          ds:3, waveM:'0.5–1.25',crest:'Large wavelets, crests begin to break' },
    { n:4,  kn:'11–16', ms:'5.5–7.9', mph:'13–18', desc:'Moderate Breeze',sea:'Slight',          ds:3, waveM:'1–2',    crest:'Small waves, fairly frequent whitecaps' },
    { n:5,  kn:'17–21', ms:'8.0–10.7',mph:'19–24', desc:'Fresh Breeze',   sea:'Moderate',        ds:4, waveM:'2–2.5',  crest:'Moderate waves, many whitecaps, some spray' },
    { n:6,  kn:'22–27', ms:'10.8–13.8',mph:'25–31',desc:'Strong Breeze',  sea:'Rough',           ds:5, waveM:'3–4',    crest:'Large waves, whitecaps everywhere, more spray' },
    { n:7,  kn:'28–33', ms:'13.9–17.1',mph:'32–38',desc:'Near Gale',      sea:'Rough',           ds:5, waveM:'4–5.5',  crest:'Sea heaps up, foam begins to streak' },
    { n:8,  kn:'34–40', ms:'17.2–20.7',mph:'39–46',desc:'Gale',           sea:'Very Rough',      ds:6, waveM:'5.5–7.5',crest:'Moderately high waves, foam in well-marked streaks' },
    { n:9,  kn:'41–47', ms:'20.8–24.4',mph:'47–54',desc:'Strong Gale',    sea:'High',            ds:7, waveM:'7–10',   crest:'High waves, sea begins to roll, dense foam streaks' },
    { n:10, kn:'48–55', ms:'24.5–28.4',mph:'55–63',desc:'Storm',          sea:'Very High',       ds:8, waveM:'9–12.5', crest:'Very high waves with overhanging crests' },
    { n:11, kn:'56–63', ms:'28.5–32.6',mph:'64–72',desc:'Violent Storm',  sea:'Very High',       ds:8, waveM:'11.5–16',crest:'Exceptionally high waves, sea covered with foam' },
    { n:12, kn:'64+',   ms:'32.7+',    mph:'73+',   desc:'Hurricane Force',sea:'Phenomenal',      ds:9, waveM:'14+',    crest:'Air filled with foam, visibility seriously affected' },
  ];

  const beaufort = (kn) => {
    if (kn < 1) return { n:0, l:'Calm' };
    if (kn <= 3) return { n:1, l:'Light Air' };
    if (kn <= 6) return { n:2, l:'Light Breeze' };
    if (kn <= 10) return { n:3, l:'Gentle Breeze' };
    if (kn <= 16) return { n:4, l:'Moderate Breeze' };
    if (kn <= 21) return { n:5, l:'Fresh Breeze' };
    if (kn <= 27) return { n:6, l:'Strong Breeze' };
    if (kn <= 33) return { n:7, l:'Near Gale' };
    if (kn <= 40) return { n:8, l:'Gale' };
    if (kn <= 47) return { n:9, l:'Strong Gale' };
    if (kn <= 55) return { n:10, l:'Storm' };
    if (kn <= 63) return { n:11, l:'Violent Storm' };
    return { n:12, l:'Hurricane Force' };
  };

  const seaState = (waveM) => {
    if (waveM == null) return { n:'—', l:'Unknown' };
    if (waveM === 0) return { n:0, l:'Calm (glassy)' };
    if (waveM <= 0.1) return { n:1, l:'Calm (rippled)' };
    if (waveM <= 0.5) return { n:2, l:'Smooth' };
    if (waveM <= 1.25) return { n:3, l:'Slight' };
    if (waveM <= 2.5) return { n:4, l:'Moderate' };
    if (waveM <= 4) return { n:5, l:'Rough' };
    if (waveM <= 6) return { n:6, l:'Very Rough' };
    if (waveM <= 9) return { n:7, l:'High' };
    if (waveM <= 14) return { n:8, l:'Very High' };
    return { n:9, l:'Phenomenal' };
  };

  // Sky condition label from total cloud cover %, plus low/mid/high breakdown
  const skyCondition = (pct) => {
    if (pct == null) return 'Unknown';
    if (pct <= 10) return 'Clear';
    if (pct <= 25) return 'Few Clouds';
    if (pct <= 50) return 'Partly Cloudy';
    if (pct <= 87) return 'Mostly Cloudy';
    return 'Overcast';
  };

  const dirLabel = (deg) => {
    if (deg == null) return '—';
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  };

  // Haversine distance (m) + initial bearing — used to derive COG/SOG from two GPS fixes
  const distAndBearing = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    const distM = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1))*Math.sin(toRad(lat2)) - Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(dLon);
    const brng = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    return { distM, brng };
  };

  // Auto-derive COG/SOG: take a GPS fix, wait, take a second fix, compute vector
  const trackCogSog = () => {
    if (!navigator.geolocation) { setTrackErr('GPS not supported on this device.'); return; }
    setTracking(true); setTrackErr(''); setCog(null); setSog(null);
    firstFixRef.current = null;

    const onFix = (pos) => {
      const fix = { lat: pos.coords.latitude, lon: pos.coords.longitude, t: pos.timestamp };
      if (!firstFixRef.current) {
        firstFixRef.current = fix;
        return;
      }
      const prev = firstFixRef.current;
      const dtSec = (fix.t - prev.t) / 1000;
      if (dtSec < 2) return; // need a meaningful time gap for accuracy
      const { distM, brng } = distAndBearing(prev.lat, prev.lon, fix.lat, fix.lon);
      const speedMs = distM / dtSec;
      const speedKn = speedMs * 1.94384;
      setCog(Math.round(brng));
      setSog(Math.round(speedKn * 10) / 10);
      setTracking(false);
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    const onErr = () => {
      setTrackErr('Could not track movement. Ensure GPS/location is enabled and the device has line of sight.');
      setTracking(false);
      if (watchIdRef.current != null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    };
    watchIdRef.current = navigator.geolocation.watchPosition(onFix, onErr, { enableHighAccuracy:true, maximumAge:0, timeout:20000 });
    // Safety timeout in case vessel isn't moving enough to register
    setTimeout(() => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setTracking(false);
        if (cog == null) setTrackErr('No movement detected — vessel may be stationary. True wind will be shown only.');
      }
    }, 15000);
  };

  const doFetch = async () => {
    if (!lat || !lon) { setErr('Enter or detect coordinates first.'); return; }
    setLoading(true); setErr(''); setWeather(null); setMarine(null);
    try {
      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,dew_point_2m,uv_index,precipitation,snowfall,cape&wind_speed_unit=kn&timezone=auto`;
      const mUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=sea_surface_temperature,wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period&timezone=auto`;
      const [wRes, mRes] = await Promise.all([fetch(wUrl), fetch(mUrl)]);
      const wJson = await wRes.json();
      const mJson = await mRes.json();
      if (wJson.error) throw new Error(wJson.reason);
      setWeather(wJson);
      if (!mJson.error) setMarine(mJson);
      setFetchedAt(new Date());
    } catch { setErr('Failed to fetch conditions. Check coordinates.'); }
    setLoading(false);
  };

  // ── Derived computed values ──────────────────────────────────────────────
  const c = weather?.current;
  const m = marine?.current;
  const bf = c ? BF_TABLE.find(r => {
    const kn = c.wind_speed_10m;
    if (r.n === 0) return kn < 1;
    if (r.n === 12) return kn >= 64;
    const [lo, hi] = r.kn.split('–').map(Number);
    return kn >= lo && kn <= hi;
  }) || BF_TABLE[0] : null;
  const ss = m ? seaState(m.wave_height) : null;

  // WMO ww code matching — find the best single code from API weather_code
  // API gives a simplified code; map to nearest WMO ww entry
  const wwCode = c?.weather_code;
  const wwMatch = wwCode != null ? WW_CODES[wwCode] : null;

  // Also find all additional matching codes based on current conditions
  const additionalWW = [];
  if (c) {
    const vis = c.visibility != null ? c.visibility / 1000 : null;
    if (vis != null && vis < 1) additionalWW.push({ ...WW_CODES[45], reason: `Visibility ${vis.toFixed(1)}km < 1km → Fog` });
    if (vis != null && vis >= 1 && vis < 5 && c.cloud_cover >= 50) additionalWW.push({ ...WW_CODES[10], reason: `Vis ${vis.toFixed(1)}km, overcast → Mist` });
    if (c.precipitation > 0 && c.temperature_2m > 2) {
      if (c.precipitation < 0.5) additionalWW.push({ ...WW_CODES[61], reason: `Precip ${c.precipitation}mm, temp ${c.temperature_2m}°C → Slight rain` });
      else if (c.precipitation < 2) additionalWW.push({ ...WW_CODES[63], reason: `Precip ${c.precipitation}mm → Moderate rain` });
      else additionalWW.push({ ...WW_CODES[65], reason: `Precip ${c.precipitation}mm → Heavy rain` });
    }
    if (c.snowfall > 0) {
      if (c.snowfall < 1) additionalWW.push({ ...WW_CODES[71], reason: `Snowfall ${c.snowfall}cm → Slight snow` });
      else if (c.snowfall < 3) additionalWW.push({ ...WW_CODES[73], reason: `Snowfall ${c.snowfall}cm → Moderate snow` });
      else additionalWW.push({ ...WW_CODES[75], reason: `Snowfall ${c.snowfall}cm → Heavy snow` });
    }
    if (c.cape > 1000 && c.precipitation > 0) additionalWW.push({ ...WW_CODES[95], reason: `CAPE ${c.cape} J/kg + precipitation → Thunderstorm likely` });
    if (c.cape > 2500) additionalWW.push({ ...WW_CODES[17], reason: `CAPE ${c.cape} J/kg → Thunderstorm risk` });
    if (c.wind_speed_10m >= 34 && c.precipitation > 0) additionalWW.push({ ...WW_CODES[82], reason: `Wind ${c.wind_speed_10m}kn BF8+ with precip → Violent shower conditions` });
  }
  // Remove duplicates between main wwMatch and additionalWW
  const allWW = wwMatch ? [{ ...wwMatch, reason: 'Primary weather code from observation' }, ...additionalWW.filter(w => w.code !== wwMatch.code)] : additionalWW;

  // Relative (apparent) wind
  let relWind = null;
  if (c && cog != null && sog != null) {
    const trueDirRad = (c.wind_direction_10m * Math.PI) / 180;
    const cogRad = (cog * Math.PI) / 180;
    const windVx = -c.wind_speed_10m * Math.sin(trueDirRad);
    const windVy = -c.wind_speed_10m * Math.cos(trueDirRad);
    const shipVx = sog * Math.sin(cogRad);
    const shipVy = sog * Math.cos(cogRad);
    const relVx = windVx - shipVx;
    const relVy = windVy - shipVy;
    const relSpeed = Math.sqrt(relVx*relVx + relVy*relVy);
    const relDirFrom = (Math.atan2(-relVx, -relVy) * 180 / Math.PI + 360) % 360;
    const relToBow = ((relDirFrom - cog) + 360) % 360;
    relWind = { speed: Math.round(relSpeed*10)/10, dirTrue: Math.round(relDirFrom), dirRelBow: Math.round(relToBow) };
  }

  // Logbook weather entry string
  const logbookEntry = c ? [
    `DATE: ${fetchedAt ? fetchedAt.toLocaleDateString() : '—'}`,
    `TIME: ${fetchedAt ? fetchedAt.toLocaleTimeString() : '—'} (LT)`,
    `POS: ${parseFloat(lat).toFixed(4)}° ${parseFloat(lon).toFixed(4)}°`,
    `WX CODE (ww): ${wwCode != null ? wwCode : '—'} — ${wwMatch ? wwMatch.desc : '—'}`,
    `AIR TEMP: ${c.temperature_2m}°C  SEA TEMP: ${m?.sea_surface_temperature != null ? m.sea_surface_temperature+'°C' : '—'}`,
    `HUMIDITY: ${c.relative_humidity_2m}%  DEW PT: ${c.dew_point_2m}°C`,
    `BARO: ${c.pressure_msl} hPa`,
    `WIND TRUE: ${c.wind_direction_10m}° (${dirLabel(c.wind_direction_10m)}) @ ${c.wind_speed_10m} kn  BF: ${bf ? bf.n : '—'}  GUSTS: ${c.wind_gusts_10m != null ? c.wind_gusts_10m+' kn' : '—'}`,
    relWind ? `WIND REL: ${relWind.dirRelBow}° rel bow (${relWind.dirTrue}° T) @ ${relWind.speed} kn  COG: ${cog}°  SOG: ${sog} kn` : `WIND REL: — (vessel not underway)`,
    `WAVE HT: ${m?.wave_height != null ? m.wave_height+'m' : '—'}  DIR: ${m?.wave_direction != null ? m.wave_direction+'° ('+dirLabel(m.wave_direction)+')' : '—'}  PERIOD: ${m?.wave_period != null ? m.wave_period+'s' : '—'}`,
    `SWELL HT: ${m?.swell_wave_height != null ? m.swell_wave_height+'m' : '—'}  DIR: ${m?.swell_wave_direction != null ? m.swell_wave_direction+'° ('+dirLabel(m.swell_wave_direction)+')' : '—'}  PERIOD: ${m?.swell_wave_period != null ? m.swell_wave_period+'s' : '—'}`,
    `SEA STATE: DS${ss ? ss.n : '—'} — ${ss ? ss.l : '—'}`,
    `SKY: ${skyCondition(c.cloud_cover)}  CLOUD: ${c.cloud_cover}% (Low ${c.cloud_cover_low}% Mid ${c.cloud_cover_mid}% High ${c.cloud_cover_high}%)`,
    `VIS: ${c.visibility != null ? (c.visibility/1000).toFixed(1)+'km' : '—'}`,
    `PRECIP: ${c.precipitation} mm  SNOW: ${c.snowfall != null ? c.snowfall+' cm' : '—'}`,
    `UV INDEX: ${c.uv_index != null ? c.uv_index : '—'}  CAPE: ${c.cape != null ? c.cape+' J/kg' : '—'}`,
  ].join('\n') : '';

  const copyLogbook = () => {
    navigator.clipboard.writeText(logbookEntry).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const rows = c ? [
    { label:'🌡️ Air Temperature',   value:`${c.temperature_2m}°C`,                                       sub:`Feels like ${c.apparent_temperature}°C` },
    { label:'🌊 Sea Surface Temp',   value: m?.sea_surface_temperature!=null ? `${m.sea_surface_temperature}°C` : '— (unavailable)',  sub:'' },
    { label:'💧 Relative Humidity',  value:`${c.relative_humidity_2m}%`,                                  sub:`Dew point ${c.dew_point_2m}°C` },
    { label:'📊 Barometric Pressure',value:`${c.pressure_msl} hPa`,                                       sub:'' },
    { label:'💨 True Wind Speed',    value:`${c.wind_speed_10m} kn`,                                      sub: bf ? `Beaufort ${bf.n} (${bf.desc}) · ${bf.ms} m/s · Gusts ${c.wind_gusts_10m != null ? c.wind_gusts_10m+' kn' : '—'}` : '' },
    { label:'🧭 True Wind Direction',value:`${c.wind_direction_10m}° (${dirLabel(c.wind_direction_10m)})`,sub:'Direction wind is blowing FROM' },
    { label:'⛵ Relative (Apparent) Wind', value: relWind ? `${relWind.speed} kn` : '— (detect COG/SOG below)', sub: relWind ? `${relWind.dirRelBow}° rel. to bow · True: ${relWind.dirTrue}°` : 'Needs vessel movement to compute' },
    { label:'🌊 Wave Height',        value: m?.wave_height!=null ? `${m.wave_height} m` : '—',            sub: m?.wave_direction!=null ? `from ${m.wave_direction}° (${dirLabel(m.wave_direction)}) · period ${m?.wave_period}s` : '' },
    { label:'🌀 Swell Height',       value: m?.swell_wave_height!=null ? `${m.swell_wave_height} m` : '—',sub: m?.swell_wave_direction!=null ? `from ${m.swell_wave_direction}° (${dirLabel(m.swell_wave_direction)}) · period ${m.swell_wave_period}s` : '' },
    { label:'🌊 Sea State (Douglas)',value: ss ? `DS${ss.n} — ${ss.l}` : '—',                             sub: bf ? `Sea: ${bf.sea} · Avg wave crest: ${bf.waveM} m` : 'WMO Sea Disturbance Scale' },
    { label:'💨 Beaufort (Full)',    value: bf ? `BF${bf.n} — ${bf.desc}` : '—',                          sub: bf ? `${bf.kn} kn · ${bf.ms} m/s · ${bf.mph} mph · Sea: ${bf.sea}` : '' },
    { label:'☁️ Sky Condition',      value: skyCondition(c.cloud_cover),                                  sub: `Total ${c.cloud_cover}% · Low ${c.cloud_cover_low}% · Mid ${c.cloud_cover_mid}% · High ${c.cloud_cover_high}%` },
    { label:'👁️ Visibility',         value: c.visibility!=null ? `${(c.visibility/1000).toFixed(1)} km` : '—', sub:'' },
    { label:'🌧️ Precipitation',      value:`${c.precipitation} mm`,                                       sub: c.precipitation > 0 ? 'Currently precipitating' : 'No precipitation' },
    { label:'❄️ Snowfall',           value: c.snowfall!=null ? `${c.snowfall} cm` : '—',                  sub: c.snowfall > 0 ? 'Currently snowing' : 'No snowfall' },
    { label:'⛈️ CAPE (Instability)', value: c.cape!=null ? `${c.cape} J/kg` : '—',                       sub: c.cape>2500?'HIGH — severe convection risk':c.cape>1000?'MODERATE instability':'LOW instability' },
    { label:'☀️ UV Index',           value: c.uv_index!=null ? c.uv_index : '—',                         sub: c.uv_index>7?'Very High':c.uv_index>4?'Moderate-High':'Low-Moderate' },
  ] : [];

  return (
    <div>
      <div style={S.info}>Live current conditions including sea state, WMO weather codes and Beaufort scale for your position. Marine data available for open sea / coastal coordinates.</div>

      <GpsBar
        lat={lat} lon={lon} setLat={setLat} setLon={setLon}
        onFetch={doFetch}
        fetchLabel="Get Current Conditions"
        gpsLoading={gpsLoading} gpsErr={gpsErr}
        getGPS={(onSuccess) => getGPS((la, lo) => { setLat(la); setLon(lo); onSuccess && onSuccess(la, lo); })}
      />

      {/* COG/SOG tracking */}
      <div style={{marginTop:12, padding:'10px 12px', background:'rgba(30,90,160,0.08)', border:'1px solid #1a4a70', borderRadius:8}}>
        <div style={{fontSize:11, color:'#7eb8d8', marginBottom:8}}>⛵ <b>Course &amp; Speed Over Ground</b> — auto-detected from GPS movement, used to compute Relative Wind.</div>
        <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
          <button style={{...S.btnGps, background: tracking?'rgba(40,120,60,0.4)':'linear-gradient(135deg,#1a6a3a,#0d4a2a)'}} onClick={trackCogSog} disabled={tracking}>
            {tracking ? '📡 Tracking movement…' : '🎯 Auto-Detect COG / SOG'}
          </button>
          {cog!=null && sog!=null && <div style={{fontSize:11,color:'#40c880'}}>COG: <b>{cog}°</b> ({dirLabel(cog)}) &nbsp;|&nbsp; SOG: <b>{sog} kn</b></div>}
        </div>
        {trackErr && <div style={{...S.error,marginTop:8}}>{trackErr}</div>}
        {tracking && <div style={{fontSize:10,color:'#4a8ab5',marginTop:6}}>Keep open while underway — needs at least 2 GPS fixes with movement between them.</div>}
      </div>

      {loading && <div style={S.spinner}>⏳ Fetching live conditions…</div>}
      {err && <div style={S.error}>{err}</div>}

      {c && (
        <div style={{marginTop:14}}>
          {/* Position / time header */}
          <div style={{...S.result, marginTop:0, marginBottom:14, lineHeight:1.8}}>
            <b style={{color:'#7ec8f5'}}>📍</b> {parseFloat(lat).toFixed(4)}°, {parseFloat(lon).toFixed(4)}°
            &nbsp;|&nbsp;<b style={{color:'#7ec8f5'}}>🕐 Local:</b> {fetchedAt ? fetchedAt.toLocaleTimeString() : '—'}
            &nbsp;|&nbsp;<b style={{color:'#7ec8f5'}}>📅</b> {fetchedAt ? fetchedAt.toLocaleDateString() : '—'}
          </div>

          {/* ── WMO Present Weather Codes matched ── */}
          {allWW.length > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11, color:'#e8d040', fontWeight:700, marginBottom:8, letterSpacing:0.5}}>
                🌐 WMO PRESENT WEATHER (ww) — MATCHING CONDITIONS
              </div>
              {allWW.map((w, i) => (
                <div key={i} style={{display:'flex', gap:12, alignItems:'flex-start', padding:'8px 12px', marginBottom:6, background:'rgba(20,50,90,0.4)', border:'1px solid #1e4070', borderRadius:8}}>
                  <div style={{minWidth:36, textAlign:'center'}}>
                    <span style={{fontSize:18, fontWeight:900, color:'#e8d040', fontFamily:'monospace'}}>{w.code}</span>
                  </div>
                  <div>
                    <div style={{fontSize:12, color:'#d0e8ff', fontWeight:600}}>{w.desc}</div>
                    <div style={{fontSize:10, color:'#4a8ab5', marginTop:2}}>{w.group}</div>
                    {w.reason && <div style={{fontSize:10, color:'#7ec8f5', marginTop:2}}>→ {w.reason}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Main conditions table ── */}
          <div style={{overflowX:'auto', marginBottom:14}}>
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>Parameter</th>
                <th style={S.th}>Value</th>
                <th style={S.th}>Detail</th>
              </tr></thead>
              <tbody>{rows.map((r,i) => (
                <tr key={i}>
                  <td style={S.td}>{r.label}</td>
                  <td style={S.td}><b style={{color:'#e8d040', fontSize:13}}>{r.value}</b></td>
                  <td style={{...S.td, fontSize:10, color:'#7eb8d8'}}>{r.sub}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>

          {/* ── 📖 Logbook Weather Entry ── */}
          <div style={{background:'rgba(10,30,60,0.6)', border:'1.5px solid #2a5a90', borderRadius:10, padding:14, marginBottom:10}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
              <div style={{fontSize:12, fontWeight:700, color:'#7ec8f5', letterSpacing:0.5}}>📖 LOGBOOK WEATHER ENTRY</div>
              <button
                onClick={copyLogbook}
                style={{...S.btnSm, background: copied?'rgba(40,160,80,0.4)':'rgba(30,80,130,0.4)', borderColor: copied?'#40c880':'#2a6090', color: copied?'#40c880':'#90c8e8'}}
              >
                {copied ? '✓ COPIED' : '📋 Copy Entry'}
              </button>
            </div>
            <pre style={{fontSize:10, color:'#a0c8e8', lineHeight:1.8, whiteSpace:'pre-wrap', margin:0, fontFamily:"'Courier New',monospace"}}>
              {logbookEntry}
            </pre>
          </div>

          <div style={{fontSize:10, color:'#4a7a9b'}}>
            💡 DS = Douglas Sea Disturbance Scale. BF = Beaufort. ww = WMO Present Weather code. CAPE &gt; 1000 J/kg indicates convective instability. Always verify with onboard instruments before making navigational decisions.
          </div>
        </div>
      )}
    </div>
  );
}

function AnchorPanel() {
  const [depth,setDepth]=useState(''); const [fb,setFb]=useState('');
  const [factor,setFactor]=useState('6'); const [dia,setDia]=useState('');
  const [res,setRes]=useState(null);
  const BOTTOMS=[
    {t:'Mud / Soft clay',f:4,note:'Poor holding'},
    {t:'Sand',f:7,note:'Good holding'},
    {t:'Gravel / Shingle',f:3,note:'Fair — risk of dragging'},
    {t:'Rock',f:1,note:'Avoid — anchor may not hold'},
    {t:'Coral',f:2,note:'Poor & damages coral'},
    {t:'Hard clay / Packed',f:6,note:'Good holding'},
  ];
  const calc=()=>{
    if(!depth||!fb)return;
    const h=parseFloat(depth)+parseFloat(fb);
    const scope=Math.ceil(h*parseFloat(factor));
    const radius=scope>h?Math.sqrt(scope**2-h**2).toFixed(1):0;
    const shackles=Math.ceil(scope/27.5);
    const chainW=dia?(parseFloat(dia)**2*0.0219*scope).toFixed(0):null;
    setRes({scope,radius,shackles,chainW});
  };
  return (
    <div>
      <div style={S.row3}>
        <div><label style={S.label}>Water Depth (m)</label><input style={S.input} value={depth} onChange={e=>setDepth(e.target.value)} placeholder="25"/></div>
        <div><label style={S.label}>Freeboard (m)</label><input style={S.input} value={fb} onChange={e=>setFb(e.target.value)} placeholder="8"/></div>
        <div>
          <label style={S.label}>Scope Factor</label>
          <select style={S.select} value={factor} onChange={e=>setFactor(e.target.value)}>
            <option value="4">4× — calm / sheltered</option>
            <option value="5">5× — moderate weather</option>
            <option value="6">6× — standard (recommended)</option>
            <option value="7">7× — heavy weather</option>
            <option value="8">8× — storm conditions</option>
          </select>
        </div>
      </div>
      <div style={S.row2}>
        <div><label style={S.label}>Chain Dia (mm) — optional, for weight</label><input style={S.input} value={dia} onChange={e=>setDia(e.target.value)} placeholder="52"/></div>
        <div style={{display:'flex',alignItems:'flex-end'}}><button style={S.btn} onClick={calc}>Calculate</button></div>
      </div>
      {res&&(
        <div style={S.result}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div><span style={{color:'#4a8ab5'}}>Min Scope Required:</span><br/><b style={{fontSize:20,color:'#7ec8f5'}}>{res.scope} m</b></div>
            <div><span style={{color:'#4a8ab5'}}>Swinging Radius:</span><br/><b style={{fontSize:20,color:'#ffd040'}}>{res.radius} m</b></div>
            <div><span style={{color:'#4a8ab5'}}>Shackles (27.5m ea):</span><br/><b style={{fontSize:17,color:'#a0d8a0'}}>{res.shackles}</b></div>
            {res.chainW&&<div><span style={{color:'#4a8ab5'}}>Chain Weight (approx):</span><br/><b style={{fontSize:17,color:'#e8a840'}}>{res.chainW} kg</b></div>}
          </div>
          <div style={{marginTop:10,background:'rgba(0,0,0,0.2)',borderRadius:6,padding:'8px 10px',fontSize:10,color:'#7eb8d8'}}>
            Scope = ({depth} + {fb}) × {factor} = {res.scope} m &nbsp;|&nbsp; Radius = √(Scope² − Depth²)
          </div>
        </div>
      )}
      <div style={{marginTop:16}}>
        <div style={{color:'#4a8ab5',fontSize:11,marginBottom:7,letterSpacing:0.5}}>BOTTOM TYPE HOLDING FACTORS</div>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Bottom Type</th><th style={S.th}>Factor</th><th style={S.th}>Remark</th></tr></thead>
          <tbody>{BOTTOMS.map((b,i)=>(
            <tr key={i}>
              <td style={S.td}>{b.t}</td>
              <td style={S.td}><b style={{color:b.f>=6?'#40d880':b.f>=4?'#ffd040':'#ff6060'}}>{b.f}×</b></td>
              <td style={{...S.td,fontSize:10,color:'#4a7a9b'}}>{b.note}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function RadiusPanel() {
  const [depth,setDepth]=useState(''); const [fb,setFb]=useState('');
  const [loa,setLoa]=useState(''); const [scope,setScope]=useState('');
  const [margin,setMargin]=useState('50'); const [res,setRes]=useState(null);
  const calc=()=>{
    if(!depth||!fb||!scope||!loa)return;
    const h=parseFloat(depth)+parseFloat(fb);
    const L=parseFloat(scope);
    const swing=L>h?Math.sqrt(L**2-h**2):0;
    const total=swing+parseFloat(loa)+parseFloat(margin);
    setRes({swing:swing.toFixed(1),total:total.toFixed(1),nm:(total/1852).toFixed(3)});
  };
  return (
    <div>
      <div style={S.info}>Safe anchorage radius = Swinging radius + Vessel LOA + Safety margin. Plot this circle on chart before anchoring.</div>
      <div style={S.row3}>
        <div><label style={S.label}>Water Depth (m)</label><input style={S.input} value={depth} onChange={e=>setDepth(e.target.value)} placeholder="25"/></div>
        <div><label style={S.label}>Freeboard (m)</label><input style={S.input} value={fb} onChange={e=>setFb(e.target.value)} placeholder="8"/></div>
        <div><label style={S.label}>Cable Scope Paid (m)</label><input style={S.input} value={scope} onChange={e=>setScope(e.target.value)} placeholder="180"/></div>
      </div>
      <div style={S.row3}>
        <div><label style={S.label}>Vessel LOA (m)</label><input style={S.input} value={loa} onChange={e=>setLoa(e.target.value)} placeholder="200"/></div>
        <div><label style={S.label}>Safety Margin (m)</label><input style={S.input} value={margin} onChange={e=>setMargin(e.target.value)} placeholder="50"/></div>
        <div style={{display:'flex',alignItems:'flex-end'}}><button style={S.btn} onClick={calc}>Calculate Radius</button></div>
      </div>
      {res&&(
        <div style={S.result}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
            <div><span style={{color:'#4a8ab5'}}>Swinging Radius:</span><br/><b style={{fontSize:17,color:'#7ec8f5'}}>{res.swing} m</b></div>
            <div><span style={{color:'#4a8ab5'}}>LOA + Margin:</span><br/><b style={{fontSize:17,color:'#ffd040'}}>{parseFloat(loa)+parseFloat(margin)} m</b></div>
            <div><span style={{color:'#4a8ab5'}}>TOTAL SAFE RADIUS:</span><br/><b style={{fontSize:20,color:'#ff9040'}}>{res.total} m</b><br/><span style={{fontSize:10,color:'#4a8ab5'}}>{res.nm} NM</span></div>
          </div>
          <div style={{marginTop:10,background:'rgba(0,0,0,0.2)',borderRadius:6,padding:'8px 10px',fontSize:10,color:'#7eb8d8'}}>
            Total = {res.swing}m (swing) + {loa}m (LOA) + {margin}m (margin). Mark this radius on chart. Check for hazards at all tidal states.
          </div>
        </div>
      )}
    </div>
  );
}

function MilestonePanel() {
  const [legs,setLegs]=useState([
    {name:'Departure', lat:'',lon:'',eta:'',speed:'',note:''},
    {name:'Waypoint 1',lat:'',lon:'',eta:'',speed:'',note:''},
    {name:'Arrival',   lat:'',lon:'',eta:'',speed:'',note:''},
  ]);
  const [results,setResults]=useState([]);
  const upd=(i,f,v)=>setLegs(legs.map((l,idx)=>idx===i?{...l,[f]:v}:l));
  const addLeg=()=>setLegs([...legs,{name:`WP ${legs.length}`,lat:'',lon:'',eta:'',speed:'',note:''}]);
  const rmLeg=i=>setLegs(legs.filter((_,idx)=>idx!==i));
  const calcVoyage=()=>{
    let cum=0;
    setResults(legs.map((leg,i)=>{
      const prev=i>0?legs[i-1]:null;
      let dist=0,hrs=null,etaCalc=null;
      if(prev&&leg.lat&&leg.lon&&prev.lat&&prev.lon){
        dist=haversineNm(parseFloat(prev.lat),parseFloat(prev.lon),parseFloat(leg.lat),parseFloat(leg.lon));
        cum+=dist;
        if(leg.speed){
          hrs=dist/parseFloat(leg.speed);
          if(prev.eta){
            const d=new Date(prev.eta);
            etaCalc=new Date(d.getTime()+hrs*3600000).toISOString().replace('T',' ').slice(0,16)+' UTC';
          }
        }
      }
      return{...leg,dist:dist.toFixed(1),cumDist:cum.toFixed(1),hrs:hrs?hrs.toFixed(1):null,etaCalc};
    }));
  };
  return (
    <div>
      <div style={{color:'#4a7a9b',fontSize:11,marginBottom:12}}>Enter voyage legs with coordinates, speed and departure time to calculate passage milestones and ETAs.</div>
      {legs.map((leg,i)=>(
        <div key={i} style={{background:'rgba(10,30,60,0.5)',border:'1px solid #1a3a60',borderRadius:8,padding:12,marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <b style={{color:'#7ec8f5',fontSize:12}}>📍 {leg.name||`Leg ${i+1}`}</b>
            {legs.length>2&&<button style={S.btnSm} onClick={()=>rmLeg(i)}>Remove</button>}
          </div>
          <div style={S.row3}>
            <div><label style={{...S.label,marginTop:0}}>Name</label><input style={S.input} value={leg.name} onChange={e=>upd(i,'name',e.target.value)}/></div>
            <div><label style={{...S.label,marginTop:0}}>Latitude</label><input style={S.input} value={leg.lat} onChange={e=>upd(i,'lat',e.target.value)} placeholder="1.29"/></div>
            <div><label style={{...S.label,marginTop:0}}>Longitude</label><input style={S.input} value={leg.lon} onChange={e=>upd(i,'lon',e.target.value)} placeholder="103.85"/></div>
          </div>
          <div style={S.row3}>
            <div><label style={{...S.label,marginTop:6}}>Speed (kn)</label><input style={S.input} value={leg.speed} onChange={e=>upd(i,'speed',e.target.value)} placeholder="14"/></div>
            <div><label style={{...S.label,marginTop:6}}>{i===0?'Departure UTC':'ETA override'}</label><input style={S.input} type="datetime-local" value={leg.eta} onChange={e=>upd(i,'eta',e.target.value)}/></div>
            <div><label style={{...S.label,marginTop:6}}>Note</label><input style={S.input} value={leg.note} onChange={e=>upd(i,'note',e.target.value)} placeholder="Port entry, bunkers…"/></div>
          </div>
        </div>
      ))}
      <div style={{display:'flex',gap:8,marginTop:4}}>
        <button style={S.btnSm} onClick={addLeg}>+ Add Leg</button>
        <button style={S.btn} onClick={calcVoyage}>Calculate Voyage</button>
      </div>
      {results.length>0&&(
        <div style={{marginTop:14,overflowX:'auto'}}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>#</th><th style={S.th}>Waypoint</th>
              <th style={S.th}>Leg NM</th><th style={S.th}>Cum NM</th>
              <th style={S.th}>Leg h</th><th style={S.th}>ETA (UTC)</th><th style={S.th}>Note</th>
            </tr></thead>
            <tbody>{results.map((r,i)=>(
              <tr key={i}>
                <td style={S.td}><span style={S.badge('#4080c0')}>{i+1}</span></td>
                <td style={S.td}><b style={{color:'#7ec8f5'}}>{r.name}</b></td>
                <td style={S.td}>{i===0?'—':r.dist}</td>
                <td style={S.td}><b style={{color:'#ffd040'}}>{r.cumDist}</b></td>
                <td style={S.td}>{r.hrs?`${r.hrs}h`:'—'}</td>
                <td style={S.td}>{r.eta?<span style={{color:'#40d880'}}>{r.eta.replace('T',' ')} UTC</span>:r.etaCalc?<span style={{color:'#a0d8a0'}}>{r.etaCalc}</span>:'—'}</td>
                <td style={{...S.td,fontSize:10,color:'#4a7a9b'}}>{r.note||'—'}</td>
              </tr>
            ))}</tbody>
          </table>
          <div style={{...S.result,marginTop:10}}>
            <b style={{color:'#7ec8f5'}}>Total voyage: </b>{results[results.length-1]?.cumDist} NM
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL RENDER MAP
// ─────────────────────────────────────────────────────────────────────────────
function renderPanel(id) {
  switch(id) {
    case 'gmdss':     return <GmdssPanel />;
    case 'coast':     return <CoastPanel />;
    case 'vhf':       return <VhfPanel />;
    case 'vhfport':   return <VhfPortPanel />;
    case 'sar':       return <SarPanel />;
    case 'flags':     return <FlagsPanel />;
    case 'smcp':      return <SmcpPanel />;
    case 'morse':     return <MorsePanel />;
    case 'weather':   return <WeatherPanel />;
    case 'cyclone':   return <CyclonePanel />;
    case 'tide':      return <TidePanel />;
    case 'sunrise':   return <SunrisePanel />;
    case 'conditions': return <ConditionsPanel />;
    case 'anchor':    return <AnchorPanel />;
    case 'radius':    return <RadiusPanel />;
    case 'milestone': return <MilestonePanel />;
    case 'wxroute':   return <ShipWeatherMapPanel />;
    default:          return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
// SHIP WEATHER ROUTING MAP
// Uses iframe + srcDoc with self-contained Leaflet HTML — no CDN timing issues
// Features: live GPS ship icon, COG/SOG 5-fix averaging, dead reckoning +1..+12h,
//           RTZ/RT3/XML/GPX route file upload, weather at each point, wind/swell arrows
// ─────────────────────────────────────────────────────────────────────────────
function ShipWeatherMapPanel() {
  const [shipPos,    setShipPos]    = useState(null);
  const [cog,        setCog]        = useState(null);
  const [sog,        setSog]        = useState(null);
  const [tracking,   setTracking]   = useState(false);
  const [trackStatus,setTrackStatus]= useState('');
  const [trackErr,   setTrackErr]   = useState('');
  const [waypoints,  setWaypoints]  = useState([]);
  const [manLat,     setManLat]     = useState('');
  const [manLon,     setManLon]     = useState('');
  const [manName,    setManName]    = useState('');
  const [drData,     setDrData]     = useState([]);
  const [wxLoading,  setWxLoading]  = useState(false);
  const [fileErr,    setFileErr]    = useState('');
  const [routeName,  setRouteName]  = useState('');
  const [mapHtml,    setMapHtml]    = useState('');
  const watchIdRef   = useRef(null);
  const fixesRef     = useRef([]);
  const { gpsLoading, gpsErr, getGPS } = useGPS();

  const dirLabel = (deg) => {
    if (deg == null) return '—';
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  };

  // ── Great-circle dead reckoning ──
  const drProject = (lat, lon, bearingDeg, distNm) => {
    const R=3440.065, d=distNm/R, brng=bearingDeg*Math.PI/180;
    const lat1=lat*Math.PI/180, lon1=lon*Math.PI/180;
    const lat2=Math.asin(Math.sin(lat1)*Math.cos(d)+Math.cos(lat1)*Math.sin(d)*Math.cos(brng));
    const lon2=lon1+Math.atan2(Math.sin(brng)*Math.sin(d)*Math.cos(lat1),Math.cos(d)-Math.sin(lat1)*Math.sin(lat2));
    return { lat:lat2*180/Math.PI, lon:((lon2*180/Math.PI)+540)%360-180 };
  };

  // ── Build self-contained Leaflet HTML for iframe ──
  // IMPORTANT: Must NOT use template literal containing </script> </html> etc.
  // Babel parses those as JSX tags and crashes the build.
  // Solution: build HTML as array of strings joined together.
  const buildMapHtml = (ship, wpList, drList, cogDeg) => {
    const center  = ship ? [ship.lat, ship.lon] : (wpList.length > 0 ? [wpList[0].lat, wpList[0].lon] : [15, 80]);
    const zoom    = ship ? 6 : 4;
    const wpJson  = JSON.stringify(wpList);
    const drJson  = JSON.stringify(drList);
    const cogRot  = cogDeg || 0;
    const cogLabel = cog != null
      ? "'COG:'+cogRot+'° SOG:'+" + JSON.stringify(sog||'—') + "+'kn'"
      : "'Live Position'";
    const shipPopup = drData.length > 0 && drData[0]?.wx
      ? "sm.bindPopup('<b>Current Position</b><br/>See weather panel below').openPopup();"
      : '';

    // Build as parts array — no closing HTML tags inside template literals
    const parts = [
      '<!DOCTYPE html><html><head>',
      '<meta charset="utf-8"/>',
      '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>',
      '<scr'+'ipt src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><'+'/scr'+'ipt>',
      '<style>',
      'html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#0a1628;}',
      '.wp-label{background:#4a9ef5;color:#fff;font-size:9px;padding:2px 5px;border-radius:3px;font-family:monospace;white-space:nowrap;border:1px solid #fff;}',
      '.dr-label{background:rgba(0,0,0,0.8);border:1.5px solid #ffcc00;color:#ffcc00;font-size:9px;padding:2px 5px;border-radius:10px;font-family:monospace;white-space:nowrap;}',
      '</'+'style></'+'head><body>',
      '<div id="map"></div>',
      '<scr'+'ipt>',
      'var map=L.map("map",{zoomControl:true,attributionControl:false}).setView(' + JSON.stringify(center) + ',' + zoom + ');',
      'L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{maxZoom:18}).addTo(map);',
      'var ship=' + (ship ? JSON.stringify(ship) : 'null') + ';',
      'var wpts=' + wpJson + ';',
      'var drs=' + drJson + ';',
      'var cogRot=' + cogRot + ';',
      'function dirLabel(d){if(d==null)return"\u2014";var dirs=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];return dirs[Math.round(d/22.5)%16];}',
      // Ship marker
      'if(ship){',
      '  var shipIcon=L.divIcon({html:"<div style=\\"transform:rotate("+cogRot+"deg);font-size:28px;line-height:1;filter:drop-shadow(0 0 6px #00ffcc)\\">\\u26F4</div><div style=\\"position:absolute;top:-16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#00ffcc;font-size:9px;padding:1px 5px;border-radius:3px;white-space:nowrap;font-family:monospace\\">"+('+cogLabel+')+"\u003c/div>",iconSize:[40,40],iconAnchor:[20,20],className:""});',
      '  var sm=L.marker([ship.lat,ship.lon],{icon:shipIcon,zIndexOffset:1000}).addTo(map);',
      shipPopup,
      '}',
      // Waypoints
      'if(wpts.length>0){',
      '  var lls=wpts.map(function(w){return[w.lat,w.lon];});',
      '  L.polyline(lls,{color:"#4a9ef5",weight:2.5,dashArray:"6,4",opacity:0.9}).addTo(map);',
      '  wpts.forEach(function(w,i){',
      '    var ic=L.divIcon({html:"<div class=\\"wp-label\\">"+(i+1)+". "+w.name+"\u003c/div>",className:"",iconAnchor:[0,10]});',
      '    L.marker([w.lat,w.lon],{icon:ic}).bindPopup("<b>WP"+(i+1)+": "+w.name+"\u003c/b><br/>"+w.lat.toFixed(5)+"\u00b0, "+w.lon.toFixed(5)+"\u00b0",{maxWidth:200}).addTo(map);',
      '  });',
      '}',
      // Dead reckoning
      'if(drs.length>0&&ship){',
      '  var drLls=[[ship.lat,ship.lon]].concat(drs.map(function(r){return[r.lat,r.lon];}));',
      '  L.polyline(drLls,{color:"#ffcc00",weight:2,dashArray:"4,6",opacity:0.8}).addTo(map);',
      '  drs.forEach(function(r){',
      '    if(r.wx&&r.wx.windDir!=null){',
      '      var rad=(r.wx.windDir||0)*Math.PI/180;',
      '      var x2=(20+16*Math.sin(rad)).toFixed(1),y2=(20-16*Math.cos(rad)).toFixed(1);',
      '      var svg="<svg width=\\"40\\" height=\\"40\\" xmlns=\\"http://www.w3.org/2000/svg\\"><defs><marker id=\\"a\\" markerWidth=\\"6\\" markerHeight=\\"6\\" refX=\\"3\\" refY=\\"3\\" orient=\\"auto\\"><path d=\\"M0,0 L6,3 L0,6 Z\\" fill=\\"#ffcc00\\"/>\u003c/marker>\u003c/defs><circle cx=\\"20\\" cy=\\"20\\" r=\\"2\\" fill=\\"#ffcc00\\"/><line x1=\\"20\\" y1=\\"20\\" x2=\\""+x2+"\\" y2=\\""+y2+"\\" stroke=\\"#ffcc00\\" stroke-width=\\"2\\" marker-end=\\"url(#a)\\"/>\u003c/svg>";',
      '      var ai=L.divIcon({html:svg,className:"",iconSize:[40,40],iconAnchor:[20,20]});',
      '      L.marker([r.lat,r.lon],{icon:ai}).addTo(map);',
      '    }',
      '    var popup="<div style=\\"font-family:monospace;font-size:11px;min-width:180px;line-height:1.8\\"><b style=\\"color:#1a5a90\\">DR +"+r.h+"h\u003c/b><br/><span style=\\"color:#555\\">"+r.eta+"\u003c/span><hr style=\\"margin:3px 0\\"/>"+(r.wx?"\\u{1F321}\\uFE0F "+(r.wx.temp!=null?r.wx.temp+"\\u00b0C":"\\u2014")+"<br/>\\uD83D\\uDCA8 "+(r.wx.windSpd!=null?r.wx.windSpd+" kn":"\\u2014")+" from "+(r.wx.windDir!=null?r.wx.windDir+"\\u00b0 ("+dirLabel(r.wx.windDir)+")":"\\u2014")+"<br/>Gusts: "+(r.wx.windGust!=null?r.wx.windGust+" kn":"\\u2014")+"<br/>Wave: "+(r.wx.waveHt!=null?r.wx.waveHt+" m":"\\u2014")+" from "+(r.wx.waveDir!=null?r.wx.waveDir+"\\u00b0 ("+dirLabel(r.wx.waveDir)+")":"\\u2014")+"<br/>Swell: "+(r.wx.swellHt!=null?r.wx.swellHt+" m":"\\u2014")+" from "+(r.wx.swellDir!=null?r.wx.swellDir+"\\u00b0 ("+dirLabel(r.wx.swellDir)+")":"\\u2014")+"<br/>"+( r.wx.pressure!=null?r.wx.pressure+" hPa":"\\u2014"):"Weather unavailable")+"\u003c/div>";',
      '    var ic=L.divIcon({html:"<div class=\\"dr-label\\">+"+r.h+"h "+(r.wx&&r.wx.windSpd!=null?"\\uD83D\\uDCA8"+r.wx.windSpd+"kn":"")+(r.wx&&r.wx.waveHt!=null?" \\uD83C\\uDF0A"+r.wx.waveHt+"m":"")+"\u003c/div>",className:"",iconAnchor:[0,12]});',
      '    L.marker([r.lat,r.lon],{icon:ic,zIndexOffset:500}).bindPopup(popup,{maxWidth:260}).addTo(map);',
      '  });',
      '}',
      'var allPts=[];',
      'if(ship)allPts.push([ship.lat,ship.lon]);',
      'wpts.forEach(function(w){allPts.push([w.lat,w.lon]);});',
      'drs.forEach(function(r){allPts.push([r.lat,r.lon]);});',
      'if(allPts.length>1)map.fitBounds(L.latLngBounds(allPts).pad(0.15));',
      '</'+'scr'+'ipt>',
      '</'+'body></'+'html>',
    ];
    return parts.join('\n');
  };

  // ── Regenerate iframe HTML whenever data changes ──
  useEffect(() => {
    setMapHtml(buildMapHtml(shipPos, waypoints, drData, cog));
  }, [shipPos, waypoints, drData, cog, sog]);

  // ── Cleanup GPS watch on unmount ──
  useEffect(() => {
    return () => { if (watchIdRef.current!=null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current=null; } };
  }, []);

  // ── Parse RTZ / RT3 / XML / GPX route files ──
  const parseRouteFile = (file) => {
    setFileErr('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'application/xml');
        if (xml.querySelector('parsererror')) throw new Error('Invalid XML file');
        let wpts = [];
        const rName = xml.querySelector('route')?.getAttribute('name') || xml.querySelector('Route')?.getAttribute('Name') || file.name.replace(/\.(rtz|rt3|xml|gpx)$/i,'');
        setRouteName(rName || file.name);
        const rtzWpts = xml.querySelectorAll('Waypoint, waypoint');
        if (rtzWpts.length > 0) {
          rtzWpts.forEach((wp,i) => {
            const pos = wp.querySelector('Position, position');
            const lat = parseFloat(pos?.getAttribute('lat')||pos?.getAttribute('Lat')||'');
            const lon = parseFloat(pos?.getAttribute('lon')||pos?.getAttribute('Lon')||pos?.getAttribute('lng')||'');
            const name = wp.getAttribute('name')||wp.getAttribute('Name')||wp.getAttribute('id')||`WP${String(i+1).padStart(3,'0')}`;
            if (!isNaN(lat)&&!isNaN(lon)) wpts.push({name,lat,lon});
          });
        }
        if (wpts.length === 0) {
          xml.querySelectorAll('wpt,rtept,trkpt').forEach((wp,i) => {
            const lat=parseFloat(wp.getAttribute('lat')||''), lon=parseFloat(wp.getAttribute('lon')||'');
            const name=wp.querySelector('name')?.textContent?.trim()||`WP${String(i+1).padStart(3,'0')}`;
            if (!isNaN(lat)&&!isNaN(lon)) wpts.push({name,lat,lon});
          });
        }
        if (wpts.length === 0) throw new Error('No waypoints found. Supported: RTZ, RT3, GPX, XML with lat/lon attributes.');
        setWaypoints(wpts);
      } catch(err) { setFileErr(`Parse error: ${err.message}`); }
    };
    reader.onerror = () => setFileErr('Failed to read file.');
    reader.readAsText(file);
  };

  // ── Fetch weather for a lat/lon ──
  const fetchWx = async (lat, lon) => {
    try {
      const [wRes,mRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,pressure_msl,precipitation&wind_speed_unit=kn&timezone=auto`),
        fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=wave_height,wave_direction,swell_wave_height,swell_wave_direction&timezone=auto`),
      ]);
      const wj=await wRes.json(), mj=await mRes.json();
      const c=wj.current||{}, m=(!mj.error&&mj.current)||{};
      return { windSpd:c.wind_speed_10m, windDir:c.wind_direction_10m, windGust:c.wind_gusts_10m, pressure:c.pressure_msl, temp:c.temperature_2m, precip:c.precipitation, waveHt:m.wave_height, waveDir:m.wave_direction, swellHt:m.swell_wave_height, swellDir:m.swell_wave_direction };
    } catch { return null; }
  };

  // ── Build dead reckoning + fetch weather at each point ──
  const buildDR = async () => {
    if (!shipPos||cog==null||sog==null) return;
    setWxLoading(true); setDrData([]);
    const hours=[1,2,4,6,8,10,12];
    const results=[];
    for (const h of hours) {
      const pos=drProject(shipPos.lat,shipPos.lon,cog,sog*h);
      const wx=await fetchWx(pos.lat,pos.lon);
      const etaTime=new Date(Date.now()+h*3600000);
      results.push({ h, lat:pos.lat, lon:pos.lon, wx, eta:etaTime.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+' '+etaTime.toLocaleDateString() });
    }
    setDrData(results);
    setWxLoading(false);
  };

  // ── Auto COG/SOG — 5 GPS fixes averaged over ~30s ──
  const trackCogSog = () => {
    if (!navigator.geolocation) { setTrackErr('GPS not supported.'); return; }
    setTracking(true); setTrackErr(''); setTrackStatus('Starting — move device outdoors for best accuracy…');
    setCog(null); setSog(null); fixesRef.current=[];
    const onFix=(pos)=>{
      if (pos.coords.accuracy>30) { setTrackStatus(`Fix ${fixesRef.current.length}/5 — accuracy ${pos.coords.accuracy.toFixed(0)}m too poor, waiting…`); return; }
      setShipPos({lat:pos.coords.latitude,lon:pos.coords.longitude});
      const fixes=fixesRef.current;
      if (fixes.length>0&&(pos.timestamp-fixes[fixes.length-1].t)<2000) return;
      fixes.push({lat:pos.coords.latitude,lon:pos.coords.longitude,t:pos.timestamp,acc:pos.coords.accuracy});
      setTrackStatus(`Fix ${fixes.length}/5 — accuracy ${pos.coords.accuracy.toFixed(0)}m ✓`);
      if (fixes.length<5) return;
      const first=fixes[0],last=fixes[fixes.length-1];
      const dtSec=(last.t-first.t)/1000;
      const toRad=d=>d*Math.PI/180,R=6371000;
      const dLat=toRad(last.lat-first.lat),dLon=toRad(last.lon-first.lon);
      const a=Math.sin(dLat/2)**2+Math.cos(toRad(first.lat))*Math.cos(toRad(last.lat))*Math.sin(dLon/2)**2;
      const distM=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
      if (distM<10){setTrackErr('Less than 10m displacement — vessel stationary or GPS insufficient.');setTracking(false);setTrackStatus('');navigator.geolocation.clearWatch(watchIdRef.current);watchIdRef.current=null;return;}
      let sinSum=0,cosSum=0;
      for(let i=1;i<fixes.length;i++){const p=fixes[i-1],c=fixes[i];const dlo=toRad(c.lon-p.lon);const y=Math.sin(dlo)*Math.cos(toRad(c.lat));const x=Math.cos(toRad(p.lat))*Math.sin(toRad(c.lat))-Math.sin(toRad(p.lat))*Math.cos(toRad(c.lat))*Math.cos(dlo);sinSum+=Math.sin(Math.atan2(y,x));cosSum+=Math.cos(Math.atan2(y,x));}
      const avgBrng=((Math.atan2(sinSum,cosSum)*180/Math.PI)+360)%360;
      const speedKn=(distM/dtSec)*1.94384;
      setCog(Math.round(avgBrng)); setSog(Math.round(speedKn*10)/10);
      setTracking(false);
      setTrackStatus(`✅ COG ${Math.round(avgBrng)}° · SOG ${(Math.round(speedKn*10)/10)} kn · from ${fixes.length} fixes over ${dtSec.toFixed(0)}s`);
      navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current=null; fixesRef.current=[];
    };
    const onErr=(e)=>{setTrackErr(e.code===1?'Permission denied.':e.code===2?'Position unavailable.':'Timed out.');setTracking(false);setTrackStatus('');};
    watchIdRef.current=navigator.geolocation.watchPosition(onFix,onErr,{enableHighAccuracy:true,maximumAge:0,timeout:30000});
    setTimeout(()=>{if(watchIdRef.current!=null){navigator.geolocation.clearWatch(watchIdRef.current);watchIdRef.current=null;if(fixesRef.current.length<5){setTracking(false);setTrackErr(`Only ${fixesRef.current.length}/5 fixes obtained. Try again in open sky.`);setTrackStatus();}}},60000);
  };

  const addManualWP=()=>{
    const lat=parseFloat(manLat),lon=parseFloat(manLon);
    if(isNaN(lat)||isNaN(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;
    setWaypoints(w=>[...w,{name:manName||`WP${w.length+1}`,lat,lon}]);
    setManLat('');setManLon('');setManName('');
  };

  return (
    <div>
      <div style={S.info}>Upload your ECDIS route file (RTZ / RT3 / XML / GPX) to plot waypoints on the map. Use live GPS to place ship. Auto-detect COG/SOG from 5 GPS fixes for accurate dead reckoning predictions.</div>

      {/* Controls */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12,alignItems:'flex-end'}}>
        <button style={{...S.btnGps,background:gpsLoading?'rgba(40,120,60,0.4)':'linear-gradient(135deg,#1a6a3a,#0d4a2a)'}}
          onClick={()=>getGPS((la,lo)=>setShipPos({lat:parseFloat(la),lon:parseFloat(lo)}))} disabled={gpsLoading}>
          {gpsLoading?'⏳ Getting GPS…':'📍 Set Ship Position (GPS)'}
        </button>
        <button style={{...S.btnGps,background:tracking?'rgba(40,120,60,0.4)':'linear-gradient(135deg,#1a4a8a,#0d2a6a)',borderColor:'#3a70d0',color:'#90c8f8'}}
          onClick={trackCogSog} disabled={tracking}>
          {tracking?`📡 ${trackStatus||'Collecting fixes…'}`:'🎯 Auto-Detect COG/SOG (5 fixes)'}
        </button>
        <label style={{...S.btnGps,background:'linear-gradient(135deg,#4a1a8a,#2a0a6a)',borderColor:'#8a50d0',color:'#c090f8',cursor:'pointer'}}>
          📂 Upload Route File
          <input type="file" accept=".rtz,.rt3,.xml,.gpx" style={{display:'none'}} onChange={e=>{if(e.target.files[0])parseRouteFile(e.target.files[0]);}}/>
        </label>
        {shipPos&&cog!=null&&sog!=null&&(
          <button style={{...S.btn,marginTop:0,background:'linear-gradient(135deg,#8a5a00,#6a3a00)',borderColor:'#e8a840',color:'#ffd080'}}
            onClick={buildDR} disabled={wxLoading}>
            {wxLoading?'⏳ Fetching weather…':'🗺️ Build DR + Fetch Weather'}
          </button>
        )}
      </div>

      {/* Status */}
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8,fontSize:11}}>
        {shipPos&&<span style={S.badge('#40c880')}>📍 {shipPos.lat.toFixed(4)}°, {shipPos.lon.toFixed(4)}°</span>}
        {cog!=null&&<span style={S.badge('#ffd040')}>COG {cog}° ({dirLabel(cog)})</span>}
        {sog!=null&&<span style={S.badge('#ffd040')}>SOG {sog} kn</span>}
        {routeName&&<span style={S.badge('#c090f8')}>📋 {routeName} — {waypoints.length} wpts</span>}
      </div>
      {trackStatus&&!tracking&&<div style={{...S.info,marginBottom:8,fontSize:10}}>{trackStatus}</div>}
      {gpsErr&&<div style={S.error}>{gpsErr}</div>}
      {trackErr&&<div style={S.error}>{trackErr}</div>}
      {fileErr&&<div style={S.error}>{fileErr}</div>}

      {/* Manual waypoint entry */}
      <div style={{background:'rgba(10,30,60,0.4)',border:'1px solid #1a3a60',borderRadius:8,padding:10,marginBottom:12}}>
        <div style={{fontSize:11,color:'#7eb8d8',marginBottom:8,fontWeight:700}}>➕ Add Manual Waypoint</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:8,alignItems:'flex-end'}}>
          <div><label style={S.label}>Name</label><input style={S.input} value={manName} onChange={e=>setManName(e.target.value)} placeholder="WP001"/></div>
          <div><label style={S.label}>Latitude</label><input style={S.input} value={manLat} onChange={e=>setManLat(e.target.value)} placeholder="1.2900"/></div>
          <div><label style={S.label}>Longitude</label><input style={S.input} value={manLon} onChange={e=>setManLon(e.target.value)} placeholder="103.8500"/></div>
          <button style={{...S.btn,marginTop:0,padding:'8px 12px'}} onClick={addManualWP}>Add</button>
        </div>
        {waypoints.length>0&&(
          <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontSize:10,color:'#4a7a9b'}}>{waypoints.length} waypoints:</span>
            {waypoints.slice(0,5).map((w,i)=><span key={i} style={S.tag}>{i+1}. {w.name}</span>)}
            {waypoints.length>5&&<span style={{fontSize:10,color:'#4a7a9b'}}>+{waypoints.length-5} more</span>}
            <button style={{...S.btnSm,marginLeft:'auto'}} onClick={()=>{setWaypoints([]);setRouteName('');}}>Clear All</button>
          </div>
        )}
      </div>

      {/* Map iframe — always rendered, no timing issues */}
      <div style={{borderRadius:10,overflow:'hidden',border:'1.5px solid #1e4070',marginBottom:12}}>
        {mapHtml ? (
          <iframe
            key={mapHtml}
            srcDoc={mapHtml}
            style={{width:'100%',height:480,border:'none',display:'block'}}
            title="Ship Weather Routing Map"
            sandbox="allow-scripts"
          />
        ) : (
          <div style={{width:'100%',height:480,background:'#0a1628',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
            <div style={{fontSize:32}}>🗺️</div>
            <div style={{fontSize:12,color:'#4a8ab5',fontFamily:"'Courier New',monospace",textAlign:'center'}}>
              Map will appear here after setting ship position or adding waypoints.<br/>
              <span style={{fontSize:10,color:'#2a5a7a'}}>Uses live internet to load map tiles.</span>
            </div>
          </div>
        )}
      </div>

      {/* DR table */}
      {drData.length>0&&(
        <div style={{marginTop:4}}>
          <div style={{fontSize:11,color:'#ffd040',fontWeight:700,marginBottom:8,letterSpacing:0.5}}>🗺️ DEAD RECKONING WEATHER PREDICTIONS</div>
          <div style={{overflowX:'auto'}}>
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>ETA</th><th style={S.th}>Position</th>
                <th style={S.th}>💨 Wind</th><th style={S.th}>🌊 Wave</th>
                <th style={S.th}>🌀 Swell</th><th style={S.th}>📊 Pressure</th><th style={S.th}>🌡️ Temp</th>
              </tr></thead>
              <tbody>{drData.map((r,i)=>(
                <tr key={i}>
                  <td style={S.td}><b style={{color:'#ffd040'}}>+{r.h}h</b><br/><span style={{fontSize:9,color:'#4a7a9b'}}>{r.eta}</span></td>
                  <td style={S.td}><code style={{fontSize:9}}>{r.lat.toFixed(3)}°<br/>{r.lon.toFixed(3)}°</code></td>
                  <td style={S.td}>{r.wx?.windSpd!=null?<><b style={{color:'#e8d040'}}>{r.wx.windSpd}kn</b><br/><span style={{fontSize:9}}>{r.wx.windDir}° {dirLabel(r.wx.windDir)}</span></>:'—'}</td>
                  <td style={S.td}>{r.wx?.waveHt!=null?<><b>{r.wx.waveHt}m</b><br/><span style={{fontSize:9}}>{r.wx.waveDir}° {dirLabel(r.wx.waveDir)}</span></>:'—'}</td>
                  <td style={S.td}>{r.wx?.swellHt!=null?<><b>{r.wx.swellHt}m</b><br/><span style={{fontSize:9}}>{r.wx.swellDir}° {dirLabel(r.wx.swellDir)}</span></>:'—'}</td>
                  <td style={S.td}>{r.wx?.pressure!=null?`${r.wx.pressure} hPa`:'—'}</td>
                  <td style={S.td}>{r.wx?.temp!=null?`${r.wx.temp}°C`:'—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{fontSize:10,color:'#4a7a9b',marginTop:8}}>
            💡 Click any marker on the map for full weather popup. 🟡 Yellow = DR track. 🔵 Blue = loaded route. Yellow arrows = wind direction at DR position.
          </div>
        </div>
      )}
    </div>
  );
}

  const [shipPos,    setShipPos]    = useState(null);  // {lat,lon}
  const [cog,        setCog]        = useState(null);
  const [sog,        setSog]        = useState(null);
  const [tracking,   setTracking]   = useState(false);
  const [trackErr,   setTrackErr]   = useState('');
  const [waypoints,  setWaypoints]  = useState([]);    // [{name,lat,lon}]
  const [manLat,     setManLat]     = useState('');
  const [manLon,     setManLon]     = useState('');
  const [manName,    setManName]    = useState('');
  const [drData,     setDrData]     = useState([]);    // [{hrs,lat,lon,wx}]
  const [wxLoading,  setWxLoading]  = useState(false);
  const [mapReady,   setMapReady]   = useState(false);
  const [fileErr,    setFileErr]    = useState('');
  const [routeName,  setRouteName]  = useState('');
  const { gpsLoading, gpsErr, getGPS } = useGPS();

  const dirLabel = (deg) => {
    if (deg == null) return '—';
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  };

  // ── Great-circle dead reckoning: project position ahead by dist(nm) on bearing(deg) ──
  const drProject = (lat, lon, bearingDeg, distNm) => {
    const R = 3440.065; // Earth radius in NM
    const d = distNm / R;
    const brng = bearingDeg * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lon1 = lon * Math.PI / 180;
    const lat2 = Math.asin(Math.sin(lat1)*Math.cos(d) + Math.cos(lat1)*Math.sin(d)*Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng)*Math.sin(d)*Math.cos(lat1), Math.cos(d)-Math.sin(lat1)*Math.sin(lat2));
    return { lat: lat2 * 180 / Math.PI, lon: ((lon2 * 180 / Math.PI) + 540) % 360 - 180 };
  };

  // ── Parse RTZ / RT3 / XML / GPX route files ──
  const parseRouteFile = (file) => {
    setFileErr('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'application/xml');
        const parseErr = xml.querySelector('parsererror');
        if (parseErr) throw new Error('Invalid XML file');

        let wpts = [];
        const rName = xml.querySelector('route')?.getAttribute('name') ||
                      xml.querySelector('Route')?.getAttribute('Name') ||
                      file.name.replace(/\.(rtz|rt3|xml|gpx)$/i, '');
        setRouteName(rName || file.name);

        // RTZ / RT3 format (Transas, JRC, Furuno, etc.)
        // Standard: <Waypoint id="1" name="WP001"><Position lat="1.29" lon="103.85"/>
        const rtzWpts = xml.querySelectorAll('Waypoint, waypoint');
        if (rtzWpts.length > 0) {
          rtzWpts.forEach((wp, i) => {
            const pos = wp.querySelector('Position, position');
            const lat = parseFloat(pos?.getAttribute('lat') || pos?.getAttribute('Lat') || '');
            const lon = parseFloat(pos?.getAttribute('lon') || pos?.getAttribute('Lon') || pos?.getAttribute('lng') || '');
            const name = wp.getAttribute('name') || wp.getAttribute('Name') || wp.getAttribute('id') || `WP${String(i+1).padStart(3,'0')}`;
            if (!isNaN(lat) && !isNaN(lon)) wpts.push({ name, lat, lon });
          });
        }

        // GPX format: <wpt lat="..." lon="..."><name>...</name> or <rtept>
        if (wpts.length === 0) {
          const gpxWpts = xml.querySelectorAll('wpt, rtept, trkpt');
          gpxWpts.forEach((wp, i) => {
            const lat = parseFloat(wp.getAttribute('lat') || '');
            const lon = parseFloat(wp.getAttribute('lon') || '');
            const name = wp.querySelector('name')?.textContent?.trim() || `WP${String(i+1).padStart(3,'0')}`;
            if (!isNaN(lat) && !isNaN(lon)) wpts.push({ name, lat, lon });
          });
        }

        // Generic XML fallback — look for any element with lat/lon attributes
        if (wpts.length === 0) {
          const allEls = xml.querySelectorAll('*');
          allEls.forEach((el, i) => {
            const lat = parseFloat(el.getAttribute('lat') || el.getAttribute('Lat') || el.getAttribute('latitude') || '');
            const lon = parseFloat(el.getAttribute('lon') || el.getAttribute('Lon') || el.getAttribute('longitude') || el.getAttribute('lng') || '');
            if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
              const name = el.getAttribute('name') || el.getAttribute('Name') || el.getAttribute('id') || `WP${String(i+1).padStart(3,'0')}`;
              wpts.push({ name, lat, lon });
            }
          });
          // Deduplicate by lat/lon
          wpts = wpts.filter((w, i, arr) => arr.findIndex(x => x.lat===w.lat && x.lon===w.lon) === i);
        }

        if (wpts.length === 0) throw new Error('No waypoints found. Supported: RTZ, RT3, GPX, XML with lat/lon attributes.');
        setWaypoints(wpts);
      } catch(err) {
        setFileErr(`Parse error: ${err.message}`);
      }
    };
    reader.onerror = () => setFileErr('Failed to read file.');
    reader.readAsText(file);
  };

  // ── Fetch weather for a lat/lon ──
  const fetchWx = async (lat, lon) => {
    try {
      const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,pressure_msl,precipitation&wind_speed_unit=kn&timezone=auto`;
      const mUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=wave_height,wave_direction,swell_wave_height,swell_wave_direction&timezone=auto`;
      const [wRes, mRes] = await Promise.all([fetch(wUrl), fetch(mUrl)]);
      const wj = await wRes.json();
      const mj = await mRes.json();
      const c  = wj.current || {};
      const m  = (!mj.error && mj.current) ? mj.current : {};
      return {
        windSpd:  c.wind_speed_10m,
        windDir:  c.wind_direction_10m,
        windGust: c.wind_gusts_10m,
        pressure: c.pressure_msl,
        temp:     c.temperature_2m,
        precip:   c.precipitation,
        waveHt:   m.wave_height,
        waveDir:  m.wave_direction,
        swellHt:  m.swell_wave_height,
        swellDir: m.swell_wave_direction,
      };
    } catch { return null; }
  };


export default function NavigationBridgePage() {
  const [active, setActive] = useState(null);
  // refs map: id → DOM node for scroll-to-card (improvement #7)
  const cardRefs = useRef({});

  // improvement #5 + #6: one open at a time, useCallback
  const toggle = useCallback((id) => {
    setActive(prev => {
      const next = prev === id ? null : id;
      // improvement #4: scroll to card after state settles
      if (next) {
        setTimeout(() => {
          cardRefs.current[next]?.scrollIntoView({ behavior:'smooth', block:'start' });
        }, 60);
      }
      return next;
    });
  }, []);

  return (
    <div style={S.page}>

      {/* Hero */}
      <div style={S.hero}>
        <span style={{fontSize:34}}>🧭</span>
        <div>
          <h1 style={S.heroTitle}>Navigation & Bridge</h1>
          <p style={S.heroSub}>GMDSS · VHF · SAR · Signal Flags · Weather · Calculators · Reference</p>
        </div>
      </div>

      {/* Inline accordion list — improvement #1 */}
      <div style={S.toolList}>
        {TOOLS.map(t => {
          const isActive = active === t.id;
          return (
            <div
              key={t.id}
              ref={el => { cardRefs.current[t.id] = el; }}
              style={{ scrollMarginTop: 70 }}
            >
              {/* Card header — clickable */}
              <div style={S.toolCard(isActive)} onClick={() => toggle(t.id)}>
                <span style={S.toolEmoji}>{t.emoji}</span>
                <div style={{flex:1}}>
                  <div style={S.toolLabel}>{t.label}</div>
                  <div style={S.toolSub}>{t.sub}</div>
                </div>
                {/* improvement #3: chevron rotates on open */}
                <span style={{
                  color: isActive ? '#7ec8f5' : '#2a6090',
                  fontSize:13,
                  transition:'transform 0.3s',
                  display:'inline-block',
                  transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>▼</span>
              </div>

              {/* Accordion body — improvement #3: smooth max-height transition */}
              <div style={S.accordionBody(isActive)}>
                {/* Only mount content when active to save memory */}
                {isActive && (
                  <div style={S.accordionInner}>
                    {renderPanel(t.id)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
