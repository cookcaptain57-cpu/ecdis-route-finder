/* eslint-disable */
// src/Pages/NavigationBridgePage.jsx
// Navigation & Bridge — 15 reference tools
// ALL static data self-contained — no constants.js dependency
// APIs: Open-Meteo (weather, marine, sunrise) — no API key
//       Windy iframe embed — cyclone tracker
// STRICT: no existing functions renamed/modified/removed

import React, { useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA — GMDSS STATIONS
// ─────────────────────────────────────────────────────────────────────────────
const GMDSS_STATIONS = [
  { id:"G001", name:"Mumbai MRCC",          region:"Indian Ocean",         country:"India",        seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"H", email:"mrccmumbai@indiancoastguard.gov.in", phone:"+91-22-22660000",  authority:"Indian Coast Guard" },
  { id:"G002", name:"Singapore MRSC",       region:"Malacca / SCS",        country:"Singapore",    seaArea:"A1/A2",    watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"W", email:"mrsc@mpa.gov.sg",                  phone:"+65-6325-2488",   authority:"MPA Singapore" },
  { id:"G003", name:"Dubai MRSC",           region:"Persian Gulf",          country:"UAE",          seaArea:"A1/A2",    watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"I", email:"mrsc@uaecoastguard.ae",            phone:"+971-4-2053400",  authority:"UAE Coast Guard" },
  { id:"G004", name:"Colombo MRCC",         region:"Indian Ocean",         country:"Sri Lanka",    seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"T", email:"mrcc@slcoastguard.lk",             phone:"+94-11-2421051",  authority:"Sri Lanka Coast Guard" },
  { id:"G005", name:"Shanghai MRCC",        region:"East China Sea",       country:"China",        seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"X", email:"shanghaimrcc@msa.gov.cn",          phone:"+86-21-65293100", authority:"China MSA" },
  { id:"G006", name:"Rotterdam MRCC",       region:"North Sea",            country:"Netherlands",  seaArea:"A1/A2",    watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"P", email:"mrcc@kustwacht.nl",                phone:"+31-223-542300",  authority:"Netherlands Coast Guard" },
  { id:"G007", name:"Falmouth MRCC",        region:"NE Atlantic",          country:"UK",           seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"K", email:"falmouthmrcc@hmcg.gov.uk",         phone:"+44-1326-317575", authority:"HM Coastguard" },
  { id:"G008", name:"Tokyo MRCC",           region:"NW Pacific",           country:"Japan",        seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"A", email:"kyunan@kaiho.mlit.go.jp",         phone:"+81-3-3591-6361", authority:"Japan Coast Guard" },
  { id:"G009", name:"Cape Town MRCC",       region:"South Atlantic",       country:"South Africa", seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"C", email:"mrcc@samsa.org.za",                phone:"+27-21-938-3300", authority:"SAMSA" },
  { id:"G010", name:"Mombasa MRSC",         region:"W Indian Ocean",       country:"Kenya",        seaArea:"A1/A2",    watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"V", email:"mrsc@kma.go.ke",                   phone:"+254-41-2313490", authority:"Kenya Maritime Authority" },
  { id:"G011", name:"Port Said MRCC",       region:"Mediterranean",        country:"Egypt",        seaArea:"A1/A2",    watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"E", email:"mrcc@nma.gov.eg",                  phone:"+20-66-3224000",  authority:"Egypt NMA" },
  { id:"G012", name:"Sydney MRCC",          region:"SW Pacific",           country:"Australia",    seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"S", email:"sydneymrcc@amsa.gov.au",           phone:"+61-2-9334-0200", authority:"AMSA" },
  { id:"G013", name:"Yokohama MRCC",        region:"NW Pacific",           country:"Japan",        seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"B", email:"yokohamaMRCC@kaiho.mlit.go.jp",   phone:"+81-45-211-1118", authority:"Japan Coast Guard 3rd Dist." },
  { id:"G014", name:"Houston MRCC",         region:"Gulf of Mexico",       country:"USA",          seaArea:"A1/A2/A3", watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"G", email:"houstonmrcc@uscg.mil",             phone:"+1-713-671-5100", authority:"US Coast Guard Dist. 8" },
  { id:"G015", name:"Karachi MRCC",         region:"Arabian Sea",          country:"Pakistan",     seaArea:"A1/A2",    watchFreq:"2182 kHz / Ch.16", dsrFreq:"2187.5 kHz / 156.525 MHz", navtexId:"J", email:"mrcc@pmsa.gov.pk",                 phone:"+92-21-99202142", authority:"Pakistan Maritime SA" },
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
  { id:"SAR001", name:"Indian Coast Guard MRCC Mumbai",    region:"Arabian Sea / Indian Ocean N",    country:"India",        phone:"+91-22-22660000",   email:"mrccmumbai@indiancoastguard.gov.in",  vhfCh:"16", mfKhz:"2182", website:"https://indiancoastguard.gov.in" },
  { id:"SAR002", name:"Indian Coast Guard MRCC Chennai",   region:"Bay of Bengal",                   country:"India",        phone:"+91-44-25362001",   email:"mrccchennai@indiancoastguard.gov.in", vhfCh:"16", mfKhz:"2182", website:"https://indiancoastguard.gov.in" },
  { id:"SAR003", name:"MPA Singapore MRSC",                region:"Malacca Strait / South China Sea",country:"Singapore",    phone:"+65-6325-2488",     email:"mrsc@mpa.gov.sg",                     vhfCh:"16", mfKhz:"2182", website:"https://www.mpa.gov.sg" },
  { id:"SAR004", name:"AMSA MRCC Canberra",                region:"Southern Ocean / SW Pacific",     country:"Australia",    phone:"+61-2-6279-5000",   email:"rccaus@amsa.gov.au",                  vhfCh:"16", mfKhz:"2182", website:"https://www.amsa.gov.au" },
  { id:"SAR005", name:"MRCC Falmouth (HM Coastguard)",     region:"NE Atlantic / English Channel",   country:"UK",           phone:"+44-1326-317575",   email:"falmouthmrcc@hmcg.gov.uk",            vhfCh:"16", mfKhz:"2182", website:"https://www.gov.uk/coastguard" },
  { id:"SAR006", name:"MRCC Japan (JCG Tokyo)",            region:"NW Pacific / Sea of Japan",       country:"Japan",        phone:"+81-3-3591-9809",   email:"kyunan@kaiho.mlit.go.jp",             vhfCh:"16", mfKhz:"2182", website:"https://www.kaiho.mlit.go.jp" },
  { id:"SAR007", name:"USMRCC Norfolk",                    region:"US East Coast / N Atlantic",      country:"USA",          phone:"+1-757-398-6700",   email:"norfolkmrcc@uscg.mil",                vhfCh:"16", mfKhz:"2182", website:"https://www.uscg.mil" },
  { id:"SAR008", name:"USMRCC San Francisco",              region:"US West Coast / N Pacific",       country:"USA",          phone:"+1-415-399-3547",   email:"sfmrcc@uscg.mil",                     vhfCh:"16", mfKhz:"2182", website:"https://www.uscg.mil" },
  { id:"SAR009", name:"SAMSA MRCC Cape Town",              region:"S Atlantic / SW Indian Ocean",    country:"South Africa", phone:"+27-21-938-3300",   email:"mrcc@samsa.org.za",                   vhfCh:"16", mfKhz:"2182", website:"https://www.samsa.org.za" },
  { id:"SAR010", name:"MRCC Netherlands (Den Helder)",     region:"North Sea",                       country:"Netherlands",  phone:"+31-223-542300",    email:"mrcc@kustwacht.nl",                   vhfCh:"16", mfKhz:"2182", website:"https://www.kustwacht.nl" },
  { id:"SAR011", name:"China MSA MRCC Shanghai",           region:"East China Sea / Yellow Sea",     country:"China",        phone:"+86-21-65293100",   email:"shanghaimrcc@msa.gov.cn",             vhfCh:"16", mfKhz:"2182", website:"https://www.msa.gov.cn" },
  { id:"SAR012", name:"MRCC Norway (Stavanger)",           region:"Norwegian Sea / N Atlantic",      country:"Norway",       phone:"+47-51-89-53-00",   email:"jrcc-nn@sdir.no",                     vhfCh:"16", mfKhz:"2182", website:"https://www.sjofartsdir.no" },
  { id:"SAR013", name:"MRCC Brazil (Rio de Janeiro)",      region:"South Atlantic",                  country:"Brazil",       phone:"+55-21-2104-6546",  email:"mrcc@marinha.mil.br",                 vhfCh:"16", mfKhz:"2182", website:"https://www.marinha.mil.br" },
  { id:"SAR014", name:"MRCC Pakistan (Karachi)",           region:"Arabian Sea N",                   country:"Pakistan",     phone:"+92-21-99202142",   email:"mrcc@pmsa.gov.pk",                    vhfCh:"16", mfKhz:"2182", website:"https://www.pmsa.gov.pk" },
  { id:"SAR015", name:"UKMTO Dubai",                       region:"Persian Gulf / Arabian Sea",      country:"UAE/UK",       phone:"+971-50-552-3215",  email:"watchkeeper@ukmto.org",               vhfCh:"16", mfKhz:"2182", website:"https://www.ukmto.org" },
  { id:"SAR016", name:"MRCC Italy (Rome)",                 region:"Central Mediterranean",           country:"Italy",        phone:"+39-06-5908-4448",  email:"romemrtimecentre@mit.gov.it",         vhfCh:"16", mfKhz:"2182", website:"https://www.guardiacostiera.gov.it" },
  { id:"SAR017", name:"MRCC Greece (Piraeus)",             region:"Aegean / E Mediterranean",        country:"Greece",       phone:"+30-210-412-1250",  email:"mrcc@hcg.gr",                         vhfCh:"16", mfKhz:"2182", website:"https://www.hcg.gr" },
  { id:"SAR018", name:"MRCC Canada (Halifax)",             region:"NW Atlantic / Canadian waters",   country:"Canada",       phone:"+1-902-427-8200",   email:"halifaxmrcc@dnd.ca",                  vhfCh:"16", mfKhz:"2182", website:"https://www.canada.ca/coastguard" },
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
  { port:'Singapore',      region:'Malacca / SE Asia',      work:['09','10','11','12','14'], vts:'VTS Singapore — Ch.10,12',  pilot:'Ch.14', emergency:'Ch.16' },
  { port:'Rotterdam',      region:'North Sea / Europe',     work:['11','13','14','19'],      vts:'Rotterdam VTS — Ch.11',     pilot:'Ch.09', emergency:'Ch.16' },
  { port:'Dubai/Jebel Ali',region:'Persian Gulf',           work:['09','13','14'],           vts:'Dubai VTS — Ch.09',         pilot:'Ch.12', emergency:'Ch.16' },
  { port:'Mumbai',         region:'Indian Ocean / W India', work:['08','11','12','14'],      vts:'Mumbai VTS — Ch.11',        pilot:'Ch.16', emergency:'Ch.16' },
  { port:'Shanghai',       region:'East China Sea',         work:['10','11','12','16'],      vts:'Shanghai VTS — Ch.11',      pilot:'Ch.14', emergency:'Ch.16' },
  { port:'Colombo',        region:'Indian Ocean',           work:['09','12','14'],           vts:'Colombo VTS — Ch.12',       pilot:'Ch.16', emergency:'Ch.16' },
  { port:'Hong Kong',      region:'South China Sea',        work:['12','14','22'],           vts:'HKVAS — Ch.12',             pilot:'Ch.22', emergency:'Ch.16' },
  { port:'Hamburg',        region:'North Sea / Europe',     work:['13','14','69','74'],      vts:'Elbe Traffic — Ch.69',      pilot:'Ch.16', emergency:'Ch.16' },
  { port:'Antwerp',        region:'North Sea / Europe',     work:['11','12','69'],           vts:'Zandvliet VTS — Ch.12',     pilot:'Ch.09', emergency:'Ch.16' },
  { port:'Fujairah',       region:'Gulf of Oman',           work:['08','09','12','14'],      vts:'Fujairah VTS — Ch.12',      pilot:'Ch.12', emergency:'Ch.16' },
  { port:'Busan',          region:'Yellow Sea / Korea',     work:['11','12','13','16'],      vts:'Busan VTS — Ch.12',         pilot:'Ch.16', emergency:'Ch.16' },
  { port:'New York',       region:'US East Coast',          work:['13','14','16'],           vts:'NY/NJ VTS — Ch.14',         pilot:'Ch.09', emergency:'Ch.16' },
  { port:'Los Angeles',    region:'US West Coast',          work:['12','14','22A'],          vts:'LA/LB VTS — Ch.14',         pilot:'Ch.14', emergency:'Ch.16' },
  { port:'Yokohama',       region:'Japan / Pacific',        work:['12','13','16'],           vts:'Tokyo Wan VTS — Ch.12',     pilot:'Ch.16', emergency:'Ch.16' },
  { port:'Port Said',      region:'Mediterranean / Suez',   work:['08','09','14','16'],      vts:'Suez Canal VTS — Ch.16',    pilot:'Ch.16', emergency:'Ch.16' },
  { port:'Cape Town',      region:'South Atlantic',         work:['08','12','14'],           vts:'Cape VTS — Ch.14',          pilot:'Ch.12', emergency:'Ch.16' },
  { port:'Mombasa',        region:'East Africa',            work:['08','12','16'],           vts:'Mombasa Port — Ch.12',      pilot:'Ch.16', emergency:'Ch.16' },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER MATH
// ─────────────────────────────────────────────────────────────────────────────
function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
  toolGrid: {
    display:'grid',
    gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',
    gap:10, padding:'18px 18px 0',
  },
  toolCard: (active) => ({
    background: active ? 'linear-gradient(135deg,#1a3a5c,#0f2840)' : 'rgba(10,26,50,0.7)',
    border: active ? '1.5px solid #3a90d0' : '1px solid #1a3a5c',
    borderRadius:10, padding:'12px 14px',
    cursor:'pointer', transition:'all 0.18s',
    display:'flex', alignItems:'center', gap:10,
  }),
  toolEmoji: { fontSize:20, minWidth:26 },
  toolLabel: { fontSize:12, fontWeight:700, color:'#a8d4f0', letterSpacing:0.5 },
  toolSub:   { fontSize:10, color:'#4a7a9b', marginTop:2 },
  panel: {
    margin:'14px 18px 0',
    background:'rgba(10,22,44,0.9)',
    border:'1.5px solid #1e4a70',
    borderRadius:12, overflow:'hidden',
  },
  panelHeader: {
    background:'linear-gradient(90deg,#0f2840,#1a3a60)',
    padding:'12px 18px',
    display:'flex', alignItems:'center', gap:10,
    borderBottom:'1px solid #1e4070',
  },
  panelTitle: { margin:0, fontSize:15, fontWeight:700, color:'#7ec8f5', letterSpacing:1 },
  panelBody:  { padding:'18px' },
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
    borderRadius:8, padding:'10px 13px', marginTop:10,
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
  { id:'weather',   emoji:'🌦️', label:'Weather Forecast',         sub:'Open-Meteo — no API key' },
  { id:'cyclone',   emoji:'🌀', label:'Cyclone Tracker',           sub:'Windy live cyclone overlay' },
  { id:'tide',      emoji:'🌊', label:'Tide / Wave Data',          sub:'Open-Meteo marine API' },
  { id:'sunrise',   emoji:'🌅', label:'Sunrise / Sunset',         sub:'7-day solar table' },
  { id:'anchor',    emoji:'⚓', label:'Anchor Gear Calculator',    sub:'Scope, radius, chain weight' },
  { id:'radius',    emoji:'📐', label:'Safe Anchorage Radius',     sub:'Swinging circle planner' },
  { id:'milestone', emoji:'🏁', label:'Voyage Milestone Tracker',  sub:'Multi-leg ETA calculator' },
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
        <select style={{...S.select}} value={cat} onChange={e=>setCat(e.target.value)}>
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
    const f = MORSE.find(m=>m.c===ch); return f?f.m:(ch===' '?'/':'?');
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
      <label style={S.label}>{mode==='encode'?'Enter text:':'Enter morse (· — spaces, / between words):'}</label>
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

function WeatherPanel() {
  const [lat,setLat]=useState(''); const [lon,setLon]=useState('');
  const [data,setData]=useState(null); const [loading,setLoading]=useState(false); const [err,setErr]=useState('');
  const WMO={0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Icing fog',51:'Light drizzle',53:'Moderate drizzle',55:'Dense drizzle',61:'Slight rain',63:'Moderate rain',65:'Heavy rain',71:'Slight snow',73:'Moderate snow',75:'Heavy snow',80:'Slight showers',81:'Moderate showers',82:'Violent showers',95:'Thunderstorm',96:'T-storm + hail',99:'T-storm + heavy hail'};
  const fetch_ = async()=>{
    if(!lat||!lon){setErr('Enter latitude and longitude');return;}
    setLoading(true);setErr('');setData(null);
    try{
      const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation,weathercode,visibility&wind_speed_unit=kn&forecast_days=5&timezone=UTC`);
      setData(await r.json());
    }catch{setErr('Failed to fetch weather. Check coordinates.');}
    setLoading(false);
  };
  return (
    <div>
      <div style={S.row3}>
        <div><label style={S.label}>Latitude</label><input style={S.input} value={lat} onChange={e=>setLat(e.target.value)} placeholder="e.g. 1.29"/></div>
        <div><label style={S.label}>Longitude</label><input style={S.input} value={lon} onChange={e=>setLon(e.target.value)} placeholder="e.g. 103.85"/></div>
        <div style={{display:'flex',alignItems:'flex-end'}}><button style={S.btn} onClick={fetch_}>Get Forecast</button></div>
      </div>
      {loading&&<div style={S.spinner}>⏳ Fetching weather data…</div>}
      {err&&<div style={S.error}>{err}</div>}
      {data?.hourly&&(
        <div style={{marginTop:12,overflowX:'auto'}}>
          <div style={{...S.info,marginBottom:8}}>Showing next 48 hours — wind in knots, temp °C, UTC</div>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Time (UTC)</th><th style={S.th}>Condition</th>
              <th style={S.th}>Temp °C</th><th style={S.th}>Wind kn</th>
              <th style={S.th}>Dir</th><th style={S.th}>Precip mm</th><th style={S.th}>Vis</th>
            </tr></thead>
            <tbody>{data.hourly.time.slice(0,48).map((t,i)=>{
              const ws=data.hourly.windspeed_10m[i];
              const wc=ws>34?'#ff4040':ws>17?'#ffaa40':ws>7?'#ffd700':'#40d880';
              return(<tr key={i}>
                <td style={S.td}><code style={{fontSize:10}}>{t.replace('T',' ')}</code></td>
                <td style={S.td}>{WMO[data.hourly.weathercode[i]]||'—'}</td>
                <td style={S.td}>{data.hourly.temperature_2m[i]}°</td>
                <td style={{...S.td,color:wc,fontWeight:700}}>{ws}</td>
                <td style={S.td}>{data.hourly.winddirection_10m[i]}°</td>
                <td style={S.td}>{data.hourly.precipitation[i]}</td>
                <td style={S.td}>{data.hourly.visibility[i]!=null?(data.hourly.visibility[i]/1000).toFixed(1)+'km':'—'}</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CyclonePanel() {
  return (
    <div>
      <div style={S.info}>Live cyclone / tropical storm tracking via Windy.com — shows active storms, forecast tracks & intensity.</div>
      <div style={{borderRadius:10,overflow:'hidden',border:'1.5px solid #1e4070'}}>
        <iframe title="Windy Cyclone Tracker"
          src="https://embed.windy.com/embed2.html?lat=15&lon=85&zoom=3&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=kt&metricTemp=%C2%B0C&radarRange=-1"
          style={{width:'100%',height:500,border:'none',display:'block'}} allowFullScreen />
      </div>
      <div style={{marginTop:8,fontSize:10,color:'#4a7a9b'}}>
        💡 Tip: Switch overlay to <b style={{color:'#7eb8d8'}}>Waves</b> or <b style={{color:'#7eb8d8'}}>Rain</b> using the Windy layer menu.
      </div>
    </div>
  );
}

function TidePanel() {
  const [lat,setLat]=useState(''); const [lon,setLon]=useState('');
  const [data,setData]=useState(null); const [loading,setLoading]=useState(false); const [err,setErr]=useState('');
  const fetch_ = async()=>{
    if(!lat||!lon){setErr('Enter coordinates');return;}
    setLoading(true);setErr('');setData(null);
    try{
      const r=await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=swell_wave_height,wave_height,wave_period,wave_direction&forecast_days=3&timezone=UTC`);
      const j=await r.json(); if(j.error)throw new Error(j.reason); setData(j);
    }catch{setErr('No marine data for this location. Try open-sea or coastal coordinates.');}
    setLoading(false);
  };
  return (
    <div>
      <div style={S.info}>ℹ️ Open-Meteo Marine API — wave & swell data for open sea / coastal locations. For precise tidal prediction consult ADMIRALTY TotalTide or port tide tables.</div>
      <div style={S.row3}>
        <div><label style={S.label}>Latitude</label><input style={S.input} value={lat} onChange={e=>setLat(e.target.value)} placeholder="e.g. 6.94"/></div>
        <div><label style={S.label}>Longitude</label><input style={S.input} value={lon} onChange={e=>setLon(e.target.value)} placeholder="e.g. 79.85"/></div>
        <div style={{display:'flex',alignItems:'flex-end'}}><button style={S.btn} onClick={fetch_}>Get Data</button></div>
      </div>
      {loading&&<div style={S.spinner}>⏳ Fetching marine data…</div>}
      {err&&<div style={S.error}>{err}</div>}
      {data?.hourly&&(
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

function SunrisePanel() {
  const [lat,setLat]=useState(''); const [lon,setLon]=useState('');
  const [data,setData]=useState(null); const [loading,setLoading]=useState(false); const [err,setErr]=useState('');
  const fmt = s=>{const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return`${h}h ${m}m`;};
  const fetch_ = async()=>{
    if(!lat||!lon){setErr('Enter coordinates');return;}
    setLoading(true);setErr('');setData(null);
    try{
      const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max&timezone=UTC&forecast_days=7`);
      const j=await r.json(); if(j.error)throw new Error(j.reason); setData(j);
    }catch{setErr('Failed to fetch solar data. Check coordinates.');}
    setLoading(false);
  };
  return (
    <div>
      <div style={S.row3}>
        <div><label style={S.label}>Latitude</label><input style={S.input} value={lat} onChange={e=>setLat(e.target.value)} placeholder="e.g. 25.05"/></div>
        <div><label style={S.label}>Longitude</label><input style={S.input} value={lon} onChange={e=>setLon(e.target.value)} placeholder="e.g. 55.13"/></div>
        <div style={{display:'flex',alignItems:'flex-end'}}><button style={S.btn} onClick={fetch_}>Get Solar Data</button></div>
      </div>
      {loading&&<div style={S.spinner}>⏳ Fetching solar data…</div>}
      {err&&<div style={S.error}>{err}</div>}
      {data?.daily&&(
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
            Scope = ({depth} + {fb}) × {factor} = {res.scope} m | Radius = √(Scope² − Depth²)
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
            Total = {res.swing}m (swing) + {loa}m (LOA) + {margin}m (margin). Mark this radius on chart. Ensure no hazards within circle at any tidal state.
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
                <td style={S.td}>{i===0?'—':`${r.dist}`}</td>
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
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function NavigationBridgePage() {
  const [active,setActive]=useState(null);
  const toggle=id=>setActive(p=>p===id?null:id);

  const renderPanel=id=>{
    switch(id){
      case 'gmdss':     return <GmdssPanel/>;
      case 'coast':     return <CoastPanel/>;
      case 'vhf':       return <VhfPanel/>;
      case 'vhfport':   return <VhfPortPanel/>;
      case 'sar':       return <SarPanel/>;
      case 'flags':     return <FlagsPanel/>;
      case 'smcp':      return <SmcpPanel/>;
      case 'morse':     return <MorsePanel/>;
      case 'weather':   return <WeatherPanel/>;
      case 'cyclone':   return <CyclonePanel/>;
      case 'tide':      return <TidePanel/>;
      case 'sunrise':   return <SunrisePanel/>;
      case 'anchor':    return <AnchorPanel/>;
      case 'radius':    return <RadiusPanel/>;
      case 'milestone': return <MilestonePanel/>;
      default: return null;
    }
  };

  return (
    <div style={S.page}>
      <div style={S.hero}>
        <span style={{fontSize:34}}>🧭</span>
        <div>
          <h1 style={S.heroTitle}>Navigation & Bridge</h1>
          <p style={S.heroSub}>GMDSS · VHF · SAR · Signal Flags · Weather · Calculators · Reference</p>
        </div>
      </div>

      <div style={S.toolGrid}>
        {TOOLS.map(t=>(
          <div key={t.id} style={S.toolCard(active===t.id)} onClick={()=>toggle(t.id)}>
            <span style={S.toolEmoji}>{t.emoji}</span>
            <div style={{flex:1}}>
              <div style={S.toolLabel}>{t.label}</div>
              <div style={S.toolSub}>{t.sub}</div>
            </div>
            <span style={{color:'#2a6090',fontSize:14}}>{active===t.id?'▲':'▼'}</span>
          </div>
        ))}
      </div>

      {active&&(
        <div style={S.panel}>
          <div style={S.panelHeader}>
            <span style={{fontSize:20}}>{TOOLS.find(t=>t.id===active)?.emoji}</span>
            <h2 style={S.panelTitle}>{TOOLS.find(t=>t.id===active)?.label}</h2>
            <button onClick={()=>setActive(null)} style={{...S.btnSm,marginLeft:'auto'}}>✕ Close</button>
          </div>
          <div style={S.panelBody}>{renderPanel(active)}</div>
        </div>
      )}
    </div>
  );
}
