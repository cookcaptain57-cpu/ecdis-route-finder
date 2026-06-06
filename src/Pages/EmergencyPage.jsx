import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────

const MRCC_DIRECTORY = [
  // Asia Pacific
  { region: "Asia Pacific", country: "Singapore", name: "MRCC Singapore", callsign: "SINGAPORE RADIO", vhf: "16", phone: "+65 6325 2562", telex: "RS 34117", email: "mrcc@mpa.gov.sg" },
  { region: "Asia Pacific", country: "Japan", name: "MRCC Tokyo", callsign: "TOKYO COAST GUARD", vhf: "16", phone: "+81 3 3591 9999", telex: "", email: "mrcc.tokyo@kaiho.mlit.go.jp" },
  { region: "Asia Pacific", country: "Australia", name: "AMSA JRCC Australia", callsign: "AUSTRALIA RESCUE", vhf: "16", phone: "+61 2 6230 6811", telex: "", email: "rccaus@amsa.gov.au" },
  { region: "Asia Pacific", country: "China", name: "MRCC China (Shanghai)", callsign: "SHANGHAI RESCUE", vhf: "16", phone: "+86 21 65323600", telex: "", email: "mrcc@msa.gov.cn" },
  { region: "Asia Pacific", country: "South Korea", name: "MRCC Busan", callsign: "BUSAN COAST GUARD", vhf: "16", phone: "+82 51 999 0115", telex: "", email: "mrcc@kcg.go.kr" },
  { region: "Asia Pacific", country: "Philippines", name: "MRCC Manila", callsign: "MANILA RADIO", vhf: "16", phone: "+63 2 527 3867", telex: "", email: "opcen@marina.gov.ph" },
  { region: "Asia Pacific", country: "India", name: "MRCC Mumbai", callsign: "MUMBAI COAST GUARD", vhf: "16", phone: "+91 22 2204 0203", telex: "", email: "mrcc-mumbai@indiancoastguard.gov.in" },
  { region: "Asia Pacific", country: "Indonesia", name: "MRCC Jakarta", callsign: "JAKARTA RADIO", vhf: "16", phone: "+62 21 3860714", telex: "", email: "mrcc@hubla.dephub.go.id" },
  { region: "Asia Pacific", country: "Malaysia", name: "MRCC Subang", callsign: "MALAYSIA RESCUE", vhf: "16", phone: "+60 3 7846 1600", telex: "", email: "mrcc@apmm.gov.my" },
  { region: "Asia Pacific", country: "Thailand", name: "MRCC Bangkok", callsign: "BANGKOK RADIO", vhf: "16", phone: "+66 2 233 4010", telex: "", email: "mrcc@md.go.th" },
  // Europe
  { region: "Europe", country: "United Kingdom", name: "MRCC Falmouth", callsign: "FALMOUTH COASTGUARD", vhf: "16", phone: "+44 1326 317575", telex: "", email: "falmouth.mrcc@mcga.gov.uk" },
  { region: "Europe", country: "Norway", name: "JRCC Norway (Bodø)", callsign: "BODØ RADIO", vhf: "16", phone: "+47 51 51 70 00", telex: "", email: "jrcc.north@hovedredningssentralen.no" },
  { region: "Europe", country: "France", name: "MRCC Cherbourg", callsign: "CROSS CORSEN", vhf: "16", phone: "+33 2 96 55 35 35", telex: "", email: "cross-corsen@equipement.gouv.fr" },
  { region: "Europe", country: "Germany", name: "MRCC Bremen", callsign: "BREMEN RESCUE RADIO", vhf: "16", phone: "+49 421 53687 0", telex: "", email: "mrcc-bremen@wsv.bund.de" },
  { region: "Europe", country: "Netherlands", name: "MRCC Den Helder", callsign: "DEN HELDER RADIO", vhf: "16", phone: "+31 223 658700", telex: "", email: "mrcc@kustwacht.nl" },
  { region: "Europe", country: "Spain", name: "MRCC Madrid", callsign: "MADRID RESCUE", vhf: "16", phone: "+34 91 7559132", telex: "", email: "mrcc.madrid@salvamento.es" },
  { region: "Europe", country: "Italy", name: "MRCC Rome", callsign: "ROMA RADIO", vhf: "16", phone: "+39 06 59084400", telex: "", email: "mrcc.roma@mit.gov.it" },
  { region: "Europe", country: "Greece", name: "JRCC Piraeus", callsign: "PIRAEUS RADIO", vhf: "16", phone: "+30 210 4121888", telex: "", email: "jrcc@hcg.gr" },
  // Americas
  { region: "Americas", country: "USA", name: "MRCC Norfolk", callsign: "US COAST GUARD", vhf: "16", phone: "+1 757 398 6390", telex: "", email: "mrcc.norfolk@uscg.mil" },
  { region: "Americas", country: "USA", name: "MRCC Miami", callsign: "US COAST GUARD MIAMI", vhf: "16", phone: "+1 305 415 6800", telex: "", email: "mrcc.miami@uscg.mil" },
  { region: "Americas", country: "Canada", name: "JRCC Halifax", callsign: "HALIFAX RESCUE", vhf: "16", phone: "+1 902 427 8200", telex: "", email: "mrsc.halifax@forces.gc.ca" },
  { region: "Americas", country: "Brazil", name: "MRCC Rio de Janeiro", callsign: "RIO RESCUE", vhf: "16", phone: "+55 21 2104 6546", telex: "", email: "mrcc.rio@marinha.mil.br" },
  { region: "Americas", country: "Panama", name: "MRCC Panama", callsign: "PANAMA RESCUE", vhf: "16", phone: "+507 232 5290", telex: "", email: "mrcc@senan.gob.pa" },
  // Middle East / Africa
  { region: "Middle East & Africa", country: "UAE", name: "MRCC Dubai", callsign: "DUBAI COAST GUARD", vhf: "16", phone: "+971 4 345 0520", telex: "", email: "mrcc@coastguard.ae" },
  { region: "Middle East & Africa", country: "Oman", name: "MRCC Muscat", callsign: "MUSCAT RESCUE", vhf: "16", phone: "+968 24 660400", telex: "", email: "mrcc@rcm.gov.om" },
  { region: "Middle East & Africa", country: "South Africa", name: "MRCC Cape Town", callsign: "CAPE TOWN RADIO", vhf: "16", phone: "+27 21 938 3300", telex: "", email: "mrcc@transport.gov.za" },
  { region: "Middle East & Africa", country: "Egypt", name: "MRCC Alexandria", callsign: "ALEXANDRIA RADIO", vhf: "16", phone: "+20 3 4800 283", telex: "", email: "mrcc@egypt-maritime.gov.eg" },
];

const TMAS_DIRECTORY = [
  { region: "Norway / North Sea", name: "TMAS Norway (Haukeland)", phone: "+47 55 97 69 31", available: "24/7", coverage: "Global (primary NW Europe)", email: "tmas@helse-bergen.no", notes: "IMO-recognized, serves North Sea vessels" },
  { region: "Mediterranean / Europe", name: "CIRM Italy (Rome)", phone: "+39 06 5921 4201", available: "24/7", coverage: "Mediterranean, global", email: "cirm@cirm.it", notes: "Centro Internazionale Radio Medico" },
  { region: "North America", name: "TMAS USA (Maryland)", phone: "+1 800 SEA 6789", available: "24/7", coverage: "Americas, Atlantic", email: "tmas@medevac.uscg.mil", notes: "USCG-linked telemedical service" },
  { region: "France / Atlantic", name: "CCMM Toulouse", phone: "+33 5 61 30 36 09", available: "24/7", coverage: "Atlantic, Indian Ocean", email: "ccmm@chu-toulouse.fr", notes: "Centre de Consultations Médicales Maritimes" },
  { region: "Spain", name: "TMAS Spain (Madrid)", phone: "+34 91 545 2300", available: "24/7", coverage: "Atlantic, Mediterranean", email: "tmas@semar.es", notes: "SEMAR telemedical assistance" },
  { region: "Australia / Pacific", name: "TMAS Australia", phone: "+61 1800 022 000", available: "24/7", coverage: "Pacific, Indian Ocean", email: "tmas@amsa.gov.au", notes: "AMSA telemedical, English-speaking" },
  { region: "Japan / Far East", name: "TMAS Japan (Tokyo)", phone: "+81 3 3591 9300", available: "24/7", coverage: "North Pacific, Far East", email: "tmas@mrcc.kaiho.mlit.go.jp", notes: "Japan Coast Guard telemedical" },
  { region: "Singapore / SE Asia", name: "TMAS Singapore", phone: "+65 6226 5452", available: "24/7", coverage: "SE Asia, Malacca Strait", email: "tmas@mpa.gov.sg", notes: "MPA Singapore, key for Malacca/Lombok" },
  { region: "India / Arabian Sea", name: "TMAS India (Mumbai)", phone: "+91 22 2204 0204", available: "24/7", coverage: "Arabian Sea, Bay of Bengal", email: "tmas@indiancoastguard.gov.in", notes: "Indian Coast Guard telemedical" },
  { region: "South Africa", name: "TMAS South Africa", phone: "+27 21 938 3400", available: "24/7", coverage: "Cape of Good Hope, S. Atlantic", email: "tmas@transport.gov.za", notes: "Cape Town-based medical response" },
];

const ITF_INSPECTORS = [
  { country: "Singapore", port: "Singapore", name: "ITF Singapore Office", phone: "+65 6221 3970", email: "singapore@itf.org.uk", address: "79 Anson Road, #17-01, Singapore 079906" },
  { country: "Japan", port: "Tokyo / Yokohama", name: "ITF Japan (JSU)", phone: "+81 3 3492 6302", email: "jsu@jsu.or.jp", address: "JSU Building, 1-4-9 Shimbashi, Tokyo" },
  { country: "South Korea", port: "Busan", name: "ITF Korea (KFSU)", phone: "+82 51 463 8808", email: "kfsu@itf.org.uk", address: "101-2 Jungang-daero, Busan" },
  { country: "Australia", port: "Sydney / Melbourne", name: "ITF Australia (MUA)", phone: "+61 2 9267 9134", email: "mua@mua.org.au", address: "365-375 Sussex St, Sydney NSW 2000" },
  { country: "United Kingdom", port: "London / Tilbury", name: "ITF UK (Nautilus)", phone: "+44 20 7780 0900", email: "helen.dalli@itf.org.uk", address: "ITF House, 49-60 Borough Rd, London SE1" },
  { country: "USA", port: "New York / New Jersey", name: "ITF USA (ILA)", phone: "+1 212 425 1200", email: "usa@itf.org.uk", address: "17 Battery Place, New York, NY 10004" },
  { country: "USA", port: "Los Angeles / Long Beach", name: "ITF USA West Coast (ILWU)", phone: "+1 213 628 9492", email: "lawestcoast@itf.org.uk", address: "1188 Franklin St, San Francisco CA" },
  { country: "Netherlands", port: "Rotterdam", name: "ITF Netherlands (FNV)", phone: "+31 10 267 4500", email: "rotterdam@itf.org.uk", address: "Boompjes 40, 3011 XB Rotterdam" },
  { country: "Germany", port: "Hamburg / Bremen", name: "ITF Germany (ver.di)", phone: "+49 40 2858 8330", email: "hamburg@itf.org.uk", address: "Besenbinderhof 60, 20097 Hamburg" },
  { country: "Greece", port: "Piraeus", name: "ITF Greece (PNO)", phone: "+30 210 4529380", email: "piraeus@itf.org.uk", address: "47-49 Akti Miaouli, Piraeus 185 36" },
  { country: "India", port: "Mumbai / Chennai", name: "ITF India (NUSI)", phone: "+91 22 2342 1357", email: "nusi@nusi.org.in", address: "174-178 NSS Marg, Mumbai 400 009" },
  { country: "Philippines", port: "Manila", name: "ITF Philippines (AMOSUP)", phone: "+63 2 527 8910", email: "amosup@amosup.org", address: "811 EDSA, Valenzuela, Manila" },
  { country: "UAE", port: "Dubai / Jebel Ali", name: "ITF UAE", phone: "+971 4 345 5222", email: "dubai@itf.org.uk", address: "Dubai Maritime City, UAE" },
  { country: "South Africa", port: "Durban / Cape Town", name: "ITF South Africa (SATAWU)", phone: "+27 31 307 3701", email: "durban@itf.org.uk", address: "2nd Floor, House of Trade Unions, Durban" },
  { country: "Brazil", port: "Santos / Rio", name: "ITF Brazil (CONTTMAF)", phone: "+55 13 3219 4300", email: "santos@itf.org.uk", address: "Av. Senador Pinheiro Machado 48, Santos" },
  { country: "Panama", port: "Panama City", name: "ITF Panama (SITRAMAPA)", phone: "+507 232 4444", email: "panama@itf.org.uk", address: "Avenida Justo Arosemena, Panama City" },
  { country: "China", port: "Shanghai", name: "ITF China (COSCO-affiliated)", phone: "+86 21 6532 7890", email: "shanghai@itf.org.uk", address: "1700 Zhongshan Rd W, Shanghai" },
  { country: "France", port: "Marseille / Le Havre", name: "ITF France (ETF)", phone: "+33 4 91 56 71 00", email: "marseille@itf.org.uk", address: "Quai de la Tourette, Marseille 13002" },
];

const FLAG_STATES = [
  { flag: "Panama", authority: "Panama Maritime Authority (AMP)", phone: "+507 501 5000", email: "amp@amp.gob.pa", website: "www.amp.gob.pa", emergency: "+507 501 5100" },
  { flag: "Marshall Islands", authority: "Republic of Marshall Islands (RMI) Registry", phone: "+1 703 620 4880", email: "mro@register-iri.com", website: "www.register-iri.com", emergency: "+1 703 620 4880" },
  { flag: "Liberia", authority: "Liberian International Ship & Corporate Registry (LISCR)", phone: "+1 703 490 1900", email: "info@liscr.com", website: "www.liscr.com", emergency: "+1 703 490 1900" },
  { flag: "Hong Kong", authority: "Hong Kong Marine Dept.", phone: "+852 2542 3711", email: "mardep@mardep.gov.hk", website: "www.mardep.gov.hk", emergency: "+852 2233 7999" },
  { flag: "Singapore", authority: "Maritime & Port Authority (MPA)", phone: "+65 6375 1600", email: "onedesk@mpa.gov.sg", website: "www.mpa.gov.sg", emergency: "+65 6325 2562" },
  { flag: "Bahamas", authority: "Bahamas Maritime Authority", phone: "+1 242 356 5483", email: "info@bahamasmaritime.com", website: "www.bahamasmaritime.com", emergency: "+1 242 356 5483" },
  { flag: "Malta", authority: "Transport Malta (Flag State)", phone: "+356 2125 0360", email: "merchant.shipping@transport.gov.mt", website: "www.transport.gov.mt", emergency: "+356 2122 4202" },
  { flag: "Cyprus", authority: "Dept. of Merchant Shipping", phone: "+357 25 848100", email: "dms@dms.mcw.gov.cy", website: "www.dms.mcw.gov.cy", emergency: "+357 25 848100" },
  { flag: "Greece", authority: "Hellenic Coast Guard", phone: "+30 210 4191000", email: "flagstate@hcg.gr", website: "www.hcg.gr", emergency: "+30 210 4121888" },
  { flag: "Norway (NIS)", authority: "Norwegian Maritime Authority", phone: "+47 52 74 50 00", email: "postmottak@sdir.no", website: "www.sdir.no", emergency: "+47 51 89 00 00" },
  { flag: "Cayman Islands", authority: "Cayman Islands Shipping Registry", phone: "+1 345 949 8831", email: "cisrinfo@cishipping.com", website: "www.cishipping.com", emergency: "+1 345 949 8831" },
  { flag: "Isle of Man", authority: "Isle of Man Ship Registry", phone: "+44 1624 688500", email: "iomsr@gov.im", website: "www.iomshipregistry.com", emergency: "+44 1624 688500" },
  { flag: "Bermuda", authority: "Bermuda Shipping and Maritime Authority", phone: "+1 441 295 7251", email: "bsma@bermudashipping.bm", website: "www.bermudashipping.bm", emergency: "+1 441 295 7251" },
  { flag: "Antigua & Barbuda", authority: "Antigua & Barbuda Registry (ABSR)", phone: "+1 268 462 1273", email: "info@abregistry.ag", website: "www.abregistry.ag", emergency: "+1 268 462 1273" },
  { flag: "Philippines", authority: "Maritime Industry Authority (MARINA)", phone: "+63 2 523 8711", email: "marina@marina.gov.ph", website: "www.marina.gov.ph", emergency: "+63 2 527 3867" },
];

const DISTRESS_TEMPLATES = {
  MAYDAY: {
    label: "MAYDAY — Grave & Imminent Danger",
    color: "#dc2626",
    fields: [
      { id: "vesselName", label: "Vessel Name", placeholder: "MV EXAMPLE" },
      { id: "callsign", label: "MMSI / Callsign", placeholder: "123456789" },
      { id: "position", label: "Position (LAT/LON or bearing/distance)", placeholder: "01°22'N 103°45'E" },
      { id: "nature", label: "Nature of Distress", placeholder: "Fire in engine room / flooding / etc." },
      { id: "pob", label: "Persons on Board", placeholder: "22" },
      { id: "info", label: "Any Other Information", placeholder: "Vessel listing 15° to starboard..." },
    ],
    template: (f) =>
      `MAYDAY MAYDAY MAYDAY\nThis is ${f.vesselName || "[VESSEL NAME]"} ${f.vesselName || "[VESSEL NAME]"} ${f.vesselName || "[VESSEL NAME]"}\nMMSI/Callsign: ${f.callsign || "[CALLSIGN]"}\nMAYDAY ${f.vesselName || "[VESSEL NAME]"}\nPosition: ${f.position || "[POSITION]"}\nWe are ${f.nature || "[NATURE OF DISTRESS]"}\nRequire immediate assistance\nPersons on board: ${f.pob || "[NUMBER]"}\n${f.info ? f.info + "\n" : ""}Over.`,
  },
  PAN_PAN: {
    label: "PAN PAN — Urgent, Non-Distress",
    color: "#d97706",
    fields: [
      { id: "vesselName", label: "Vessel Name", placeholder: "MV EXAMPLE" },
      { id: "callsign", label: "MMSI / Callsign", placeholder: "123456789" },
      { id: "position", label: "Position", placeholder: "01°22'N 103°45'E" },
      { id: "nature", label: "Nature of Urgency", placeholder: "Medical emergency / person overboard..." },
      { id: "pob", label: "Persons on Board", placeholder: "22" },
      { id: "info", label: "Assistance Required", placeholder: "Medical advice / towing / etc." },
    ],
    template: (f) =>
      `PAN PAN PAN PAN PAN PAN\nAll stations, all stations, all stations\nThis is ${f.vesselName || "[VESSEL NAME]"} ${f.vesselName || "[VESSEL NAME]"} ${f.vesselName || "[VESSEL NAME]"}\nMMSI/Callsign: ${f.callsign || "[CALLSIGN]"}\nPosition: ${f.position || "[POSITION]"}\nUrgency: ${f.nature || "[NATURE]"}\nPersons on board: ${f.pob || "[NUMBER]"}\nAssistance required: ${f.info || "[ASSISTANCE]"}\nOver.`,
  },
  SECURITE: {
    label: "SÉCURITÉ — Safety / Navigational Warning",
    color: "#2563eb",
    fields: [
      { id: "vesselName", label: "Vessel Name", placeholder: "MV EXAMPLE" },
      { id: "callsign", label: "MMSI / Callsign", placeholder: "123456789" },
      { id: "position", label: "Position", placeholder: "01°22'N 103°45'E" },
      { id: "nature", label: "Hazard / Warning Message", placeholder: "Unlit vessel / debris / dangerous wreck at..." },
    ],
    template: (f) =>
      `SÉCURITÉ SÉCURITÉ SÉCURITÉ\nAll stations, all stations, all stations\nThis is ${f.vesselName || "[VESSEL NAME]"} ${f.vesselName || "[VESSEL NAME]"} ${f.vesselName || "[VESSEL NAME]"}\nMMSI/Callsign: ${f.callsign || "[CALLSIGN]"}\nPosition: ${f.position || "[POSITION]"}\nNavigational warning: ${f.nature || "[HAZARD DESCRIPTION]"}\nOut.`,
  },
  MAN_OVERBOARD: {
    label: "Man Overboard (MOB)",
    color: "#7c3aed",
    fields: [
      { id: "vesselName", label: "Vessel Name", placeholder: "MV EXAMPLE" },
      { id: "callsign", label: "MMSI / Callsign", placeholder: "123456789" },
      { id: "position", label: "MOB Position / Last Seen", placeholder: "01°22'N 103°45'E" },
      { id: "time", label: "Time Person Went Overboard (UTC)", placeholder: "0845 UTC" },
      { id: "desc", label: "Description of Person", placeholder: "Male, orange lifejacket, blue overalls" },
    ],
    template: (f) =>
      `MAYDAY MAYDAY MAYDAY\nAll stations, all stations, all stations\nThis is ${f.vesselName || "[VESSEL NAME]"}\nMMSI/Callsign: ${f.callsign || "[CALLSIGN]"}\nMAN OVERBOARD at position: ${f.position || "[POSITION]"}\nTime: ${f.time || "[TIME] UTC"}\nDescription: ${f.desc || "[DESCRIPTION]"}\nAll vessels in vicinity requested to keep sharp lookout and assist.\nOver.`,
  },
};

const EMERGENCY_SIGNALS = [
  {
    category: "Visual Day Signals",
    signals: [
      { name: "Orange Smoke Signal", description: "Continuous orange smoke — distress signal for vessels and aircraft", icon: "🟠", regulation: "SOLAS Reg. III/6" },
      { name: "Flames on Vessel", description: "Flames on board (burning tar barrel or similar)", icon: "🔥", regulation: "SOLAS Annex IV" },
      { name: "Square Flag + Ball", description: "Square flag with ball above or below — internationally recognized distress", icon: "🚩", regulation: "COLREGS Annex IV" },
      { name: "Arms Raised & Lowered", description: "Slowly raising and lowering outstretched arms repeatedly", icon: "🙋", regulation: "COLREGS Annex IV" },
      { name: "SOS by Any Means", description: "SOS (· · · — — — · · ·) by light, flag, or any means", icon: "💡", regulation: "COLREGS Annex IV" },
    ],
  },
  {
    category: "Visual Night Signals",
    signals: [
      { name: "Red Parachute Flare", description: "Red parachute flare visible for 40+ seconds — night distress", icon: "🔴", regulation: "SOLAS Reg. III/6" },
      { name: "Red Hand Flare", description: "Red hand flare held over leeward side, burning time ≥ 1 min", icon: "🔴", regulation: "SOLAS Reg. III/6" },
      { name: "White Flare", description: "Fired to warn other vessels of your position (not distress)", icon: "⚪", regulation: "COLREGS" },
      { name: "Searchlight SOS", description: "SOS in morse code by searchlight or flashlight", icon: "🔦", regulation: "COLREGS Annex IV" },
    ],
  },
  {
    category: "Sound Signals",
    signals: [
      { name: "Fog Horn (Continuous)", description: "Continuous sounding of fog signal apparatus — distress", icon: "📢", regulation: "COLREGS Annex IV" },
      { name: "Gun / Explosive Signal", description: "Firing of explosive signal at intervals of ~1 minute", icon: "💥", regulation: "COLREGS Annex IV" },
      { name: "SOS in Morse (Sound)", description: "· · · — — — · · · by any sound apparatus", icon: "🔊", regulation: "COLREGS Annex IV" },
    ],
  },
  {
    category: "Electronic / Radio Signals",
    signals: [
      { name: "EPIRB Activation", description: "406 MHz EPIRB activation — Cospas-Sarsat satellite detection, global coverage", icon: "📡", regulation: "SOLAS Reg. IV/7" },
      { name: "DSC Distress Alert", description: "Digital Selective Calling on VHF Ch. 70 or MF 2187.5 kHz — press red button 5 sec", icon: "📻", regulation: "SOLAS Reg. IV/9" },
      { name: "SART Activation", description: "Search and Rescue Transponder — activates on 9 GHz radar, visible 8nm on radar screen", icon: "📶", regulation: "SOLAS Reg. III/6" },
      { name: "AIS-SART", description: "AIS-based SART transmitting position every 1 minute to AIS receivers", icon: "🛰️", regulation: "SOLAS MSC.246(83)" },
      { name: "PLB Activation", description: "Personal Locator Beacon — 406 MHz, for individual use in water", icon: "🔵", regulation: "SOLAS / IMO MSC" },
      { name: "VHF Ch.16 MAYDAY", description: "Voice MAYDAY on VHF Channel 16 — international distress frequency", icon: "🎙️", regulation: "ITU Radio Regulations" },
    ],
  },
  {
    category: "Pyrotechnics Safety",
    signals: [
      { name: "Aim Downwind", description: "Always fire parachute flares downwind and at 15° from vertical in strong winds", icon: "↗️", regulation: "SOLAS guidance" },
      { name: "Check Expiry", description: "SOLAS flares expire 3 years from manufacture. Check date before use.", icon: "📅", regulation: "SOLAS Reg. III/35" },
      { name: "Hold Away from Body", description: "Hold hand flares over the side at arm's length — hot slag burns", icon: "⚠️", regulation: "Onboard Safety Manual" },
    ],
  },
];

const PHRASEBOOK = [
  {
    category: "Distress & Urgency",
    phrases: [
      { phrase: "MAYDAY MAYDAY MAYDAY", use: "Grave and imminent danger to vessel or persons — highest priority" },
      { phrase: "PAN PAN PAN PAN PAN PAN", use: "Urgent situation — medical emergency, person overboard, etc." },
      { phrase: "SÉCURITÉ SÉCURITÉ SÉCURITÉ", use: "Safety message — navigational hazard or important meteorological warning" },
      { phrase: "I am in distress and require immediate assistance.", use: "Plain language distress declaration" },
      { phrase: "I require medical assistance.", use: "Medical emergency onboard" },
      { phrase: "Man overboard. My position is...", use: "Person in the water — give position, time, description" },
      { phrase: "I am abandoning ship. My position is...", use: "Crew abandoning vessel" },
    ],
  },
  {
    category: "Fire & Flooding",
    phrases: [
      { phrase: "I have fire on board and require immediate assistance.", use: "Fire emergency" },
      { phrase: "My vessel is flooding. I require pumping assistance.", use: "Flooding / ingress of water" },
      { phrase: "The fire is out of control.", use: "Escalating fire situation" },
      { phrase: "I require a firefighting tug.", use: "Requesting specialized firefighting support" },
      { phrase: "My vessel has an uncontrolled list of ___ degrees to ___.", use: "Stability emergency" },
    ],
  },
  {
    category: "Medical Emergencies",
    phrases: [
      { phrase: "I have a seriously ill/injured crew member.", use: "Requesting medical advice or evacuation" },
      { phrase: "I require medical evacuation (MEDEVAC).", use: "Requesting helicopter or vessel to transfer patient" },
      { phrase: "The patient is unconscious / not breathing.", use: "Critical medical status" },
      { phrase: "I require a doctor.", use: "Requesting physician contact or TMAS service" },
      { phrase: "The patient has chest pain / difficulty breathing.", use: "Possible cardiac/respiratory emergency" },
      { phrase: "I require helicopter assistance.", use: "Requesting air medevac" },
    ],
  },
  {
    category: "Navigation & Collision",
    phrases: [
      { phrase: "I am proceeding to your assistance.", use: "Responding vessel to a distress call" },
      { phrase: "What is your position, course and speed?", use: "Requesting vessel status" },
      { phrase: "I am aground. My position is...", use: "Vessel grounded" },
      { phrase: "I have a steering failure / engine failure.", use: "Loss of control / propulsion" },
      { phrase: "I require a tug.", use: "Requesting towage assistance" },
      { phrase: "I have a dangerous cargo on fire.", use: "Hazardous material / chemical fire" },
      { phrase: "I am not under command.", use: "Vessel unable to maneuver — NUC lights/shapes displayed" },
    ],
  },
  {
    category: "Search & Rescue Co-ordination",
    phrases: [
      { phrase: "I am commencing search in position...", use: "SAR co-ordination" },
      { phrase: "I have sighted a survivor / life raft at position...", use: "Reporting survivor location" },
      { phrase: "I am the On-Scene Co-ordinator (OSC).", use: "SAR on-scene management" },
      { phrase: "Please relay my distress message.", use: "Requesting message relay to MRCC" },
      { phrase: "I have rescued ___ survivors.", use: "Reporting rescued persons" },
      { phrase: "Cancel my distress alert — the emergency has been resolved.", use: "Cancelling a distress alert after resolution" },
    ],
  },
  {
    category: "Port & Shore Communication",
    phrases: [
      { phrase: "I require a pilot.", use: "Requesting pilotage on approach" },
      { phrase: "I have a stoaway/s on board.", use: "Reporting stoaway(s) to port authority" },
      { phrase: "I require port health clearance.", use: "Requesting pratique from health authorities" },
      { phrase: "I have a deficiency which requires immediate attention.", use: "Reporting a safety-critical defect" },
      { phrase: "I am proceeding to the anchorage.", use: "Vessel movements" },
    ],
  },
];

const REGIONS = ["All Regions", ...Array.from(new Set(MRCC_DIRECTORY.map((m) => m.region)))];
const ALL_COUNTRIES_ITF = ["All Countries", ...Array.from(new Set(ITF_INSPECTORS.map((i) => i.country))).sort()];

// ─────────────────────────────────────────────
// GPS REGION DETECTION (approx by lat/lon)
// ─────────────────────────────────────────────
function detectRegionFromCoords(lat, lon) {
  if (lat >= -50 && lat <= 50 && lon >= 60 && lon <= 180) return "Asia Pacific";
  if (lat >= 35 && lat <= 75 && lon >= -30 && lon <= 45) return "Europe";
  if (lat >= -60 && lat <= 75 && lon >= -170 && lon <= -30) return "Americas";
  if ((lat >= -40 && lat <= 40 && lon >= -20 && lon <= 60) || (lat >= 10 && lat <= 35 && lon >= 35 && lon <= 65)) return "Middle East & Africa";
  return "All Regions";
}

// ─────────────────────────────────────────────
// COPY UTILITY
// ─────────────────────────────────────────────
function useCopyToClipboard() {
  const [copiedId, setCopiedId] = useState(null);
  const copy = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };
  return { copy, copiedId };
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    color: "#e5e5e5",
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
  },
  sosBar: {
    background: "linear-gradient(135deg, #1a0000 0%, #2d0000 50%, #1a0000 100%)",
    borderBottom: "2px solid #dc2626",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  sosLeft: { display: "flex", alignItems: "center", gap: "16px" },
  sosBtn: {
    background: "#dc2626",
    color: "#fff",
    border: "2px solid #ef4444",
    borderRadius: "8px",
    padding: "10px 22px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "18px",
    fontWeight: "700",
    letterSpacing: "4px",
    cursor: "default",
    userSelect: "none",
    boxShadow: "0 0 20px #dc262680",
    animation: "sosPulse 1.8s ease-in-out infinite",
  },
  sosTitle: { fontSize: "20px", fontWeight: "700", color: "#fff", letterSpacing: "2px" },
  sosSubtitle: { fontSize: "11px", color: "#ef4444", marginTop: "2px", letterSpacing: "1px" },
  gpsBadge: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "11px",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  // TABS
  tabBar: {
    display: "flex",
    overflowX: "auto",
    background: "#111",
    borderBottom: "1px solid #222",
    scrollbarWidth: "none",
    padding: "0 4px",
  },
  tab: (active) => ({
    flexShrink: 0,
    padding: "10px 14px",
    fontSize: "11px",
    letterSpacing: "0.5px",
    fontWeight: active ? "700" : "400",
    color: active ? "#ef4444" : "#666",
    borderBottom: active ? "2px solid #ef4444" : "2px solid transparent",
    cursor: "pointer",
    whiteSpace: "nowrap",
    background: "none",
    border: "none",
    borderBottom: active ? "2px solid #ef4444" : "2px solid transparent",
    fontFamily: "'IBM Plex Mono', monospace",
    transition: "color 0.2s",
  }),
  // SECTION
  section: {
    padding: "28px 20px",
    borderBottom: "1px solid #1a1a1a",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "20px",
    paddingBottom: "10px",
    borderBottom: "1px solid #1f1f1f",
  },
  sectionIcon: { fontSize: "22px" },
  sectionTitle: { fontSize: "15px", fontWeight: "700", color: "#fff", letterSpacing: "2px", textTransform: "uppercase" },
  sectionSubtitle: { fontSize: "11px", color: "#555", marginTop: "2px" },
  // CARDS
  card: {
    background: "#111",
    border: "1px solid #1f1f1f",
    borderRadius: "8px",
    padding: "14px 16px",
    marginBottom: "10px",
    transition: "border-color 0.2s",
  },
  cardTitle: { fontSize: "13px", fontWeight: "700", color: "#fff", marginBottom: "4px" },
  cardMeta: { fontSize: "11px", color: "#888", lineHeight: "1.8" },
  redTag: {
    display: "inline-block",
    background: "#1f0000",
    border: "1px solid #dc2626",
    color: "#ef4444",
    borderRadius: "4px",
    padding: "1px 7px",
    fontSize: "10px",
    fontWeight: "700",
    marginRight: "6px",
    marginBottom: "4px",
  },
  greenTag: {
    display: "inline-block",
    background: "#001a0a",
    border: "1px solid #16a34a",
    color: "#4ade80",
    borderRadius: "4px",
    padding: "1px 7px",
    fontSize: "10px",
    fontWeight: "700",
    marginRight: "6px",
    marginBottom: "4px",
  },
  blueTag: {
    display: "inline-block",
    background: "#00101f",
    border: "1px solid #2563eb",
    color: "#60a5fa",
    borderRadius: "4px",
    padding: "1px 7px",
    fontSize: "10px",
    fontWeight: "700",
    marginRight: "6px",
    marginBottom: "4px",
  },
  // GRID
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "10px" },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" },
  // INPUT
  input: {
    width: "100%",
    background: "#0d0d0d",
    border: "1px solid #2a2a2a",
    borderRadius: "6px",
    padding: "8px 12px",
    color: "#e5e5e5",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "12px",
    marginBottom: "8px",
    boxSizing: "border-box",
    outline: "none",
  },
  select: {
    background: "#0d0d0d",
    border: "1px solid #2a2a2a",
    borderRadius: "6px",
    padding: "7px 12px",
    color: "#e5e5e5",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "12px",
    marginRight: "8px",
    marginBottom: "8px",
    outline: "none",
    cursor: "pointer",
  },
  textarea: {
    width: "100%",
    background: "#050505",
    border: "1px solid #dc2626",
    borderRadius: "6px",
    padding: "14px",
    color: "#ef4444",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "12px",
    lineHeight: "1.8",
    resize: "vertical",
    boxSizing: "border-box",
    minHeight: "160px",
    outline: "none",
  },
  btn: (color = "#dc2626") => ({
    background: color,
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "11px",
    fontWeight: "700",
    letterSpacing: "1px",
    cursor: "pointer",
    marginRight: "8px",
    marginBottom: "4px",
  }),
  // DPA
  dpaForm: {
    background: "#0d0d0d",
    border: "1px dashed #333",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "16px",
  },
  label: { fontSize: "10px", color: "#666", letterSpacing: "1px", display: "block", marginBottom: "4px", marginTop: "8px" },
  // Template output
  templateBox: {
    background: "#050505",
    border: "1px solid #dc2626",
    borderRadius: "8px",
    padding: "16px",
    marginTop: "12px",
  },
  // Phrasebook
  phraseRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "10px 0",
    borderBottom: "1px solid #161616",
  },
  phraseText: { fontSize: "13px", color: "#ef4444", fontWeight: "600", marginBottom: "3px" },
  phraseUse: { fontSize: "11px", color: "#666", lineHeight: "1.5" },
  // Signal card
  signalCard: {
    background: "#111",
    border: "1px solid #1f1f1f",
    borderRadius: "8px",
    padding: "12px",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },
  signalIcon: { fontSize: "28px", flexShrink: 0 },
  signalName: { fontSize: "12px", fontWeight: "700", color: "#fff", marginBottom: "4px" },
  signalDesc: { fontSize: "11px", color: "#888", lineHeight: "1.5", marginBottom: "4px" },
};

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function CopyBtn({ text, id, copy, copiedId }) {
  return (
    <button
      style={{ ...S.btn("#1f2937"), fontSize: "10px", padding: "4px 10px" }}
      onClick={() => copy(text, id)}
    >
      {copiedId === id ? "✓ COPIED" : "COPY"}
    </button>
  );
}

// ── GPS CONTACT SECTION ──
function GpsSection() {
  const [gpsStatus, setGpsStatus] = useState("idle"); // idle | loading | success | error
  const [coords, setCoords] = useState(null);
  const [detectedRegion, setDetectedRegion] = useState("All Regions");
  const [manualRegion, setManualRegion] = useState("All Regions");
  const { copy, copiedId } = useCopyToClipboard();

  const activeRegion = coords ? detectedRegion : manualRegion;
  const filtered = activeRegion === "All Regions" ? MRCC_DIRECTORY.slice(0, 6) : MRCC_DIRECTORY.filter((m) => m.region === activeRegion);

  const getGPS = () => {
    if (!navigator.geolocation) { setGpsStatus("error"); return; }
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude.toFixed(4), lon: longitude.toFixed(4) });
        setDetectedRegion(detectRegionFromCoords(latitude, longitude));
        setGpsStatus("success");
      },
      () => setGpsStatus("error")
    );
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button style={S.btn()} onClick={getGPS} disabled={gpsStatus === "loading"}>
          {gpsStatus === "loading" ? "⌛ LOCATING..." : "📍 AUTO-DETECT MY REGION"}
        </button>
        <span style={{ fontSize: "11px", color: "#555" }}>or manually select:</span>
        <select style={S.select} value={manualRegion} onChange={(e) => { setManualRegion(e.target.value); setCoords(null); setGpsStatus("idle"); }}>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {gpsStatus === "success" && coords && (
        <div style={{ ...S.card, borderColor: "#16a34a", marginBottom: "16px" }}>
          <span style={S.greenTag}>✓ GPS</span>
          <span style={{ fontSize: "12px", color: "#4ade80" }}>Position: {coords.lat}°, {coords.lon}° — Detected region: <strong>{detectedRegion}</strong></span>
        </div>
      )}
      {gpsStatus === "error" && (
        <div style={{ ...S.card, borderColor: "#d97706", marginBottom: "16px" }}>
          <span style={{ fontSize: "11px", color: "#d97706" }}>⚠ GPS unavailable or denied. Please select region manually above.</span>
        </div>
      )}

      <div style={S.grid2}>
        {filtered.map((m, i) => (
          <div key={i} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={S.redTag}>{m.country}</span>
                <div style={S.cardTitle}>{m.name}</div>
              </div>
              <CopyBtn text={`${m.name}\nPhone: ${m.phone}\nVHF: Ch.${m.vhf}\nEmail: ${m.email}`} id={`gps-${i}`} copy={copy} copiedId={copiedId} />
            </div>
            <div style={S.cardMeta}>
              <div>📻 VHF Ch. <strong style={{ color: "#ef4444" }}>{m.vhf}</strong> &nbsp;|&nbsp; Callsign: {m.callsign}</div>
              <div>📞 {m.phone}</div>
              {m.email && <div>✉ {m.email}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MRCC FULL DIRECTORY ──
function MrccSection() {
  const [filter, setFilter] = useState("All Regions");
  const [search, setSearch] = useState("");
  const { copy, copiedId } = useCopyToClipboard();

  const filtered = MRCC_DIRECTORY.filter((m) => {
    const matchRegion = filter === "All Regions" || m.region === filter;
    const matchSearch = !search || m.country.toLowerCase().includes(search.toLowerCase()) || m.name.toLowerCase().includes(search.toLowerCase());
    return matchRegion && matchSearch;
  });

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
        <input style={{ ...S.input, width: "200px", marginBottom: 0 }} placeholder="Search country / name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={S.select} value={filter} onChange={(e) => setFilter(e.target.value)}>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span style={{ fontSize: "11px", color: "#555", alignSelf: "center" }}>{filtered.length} stations</span>
      </div>
      <div style={S.grid2}>
        {filtered.map((m, i) => (
          <div key={i} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={S.redTag}>{m.region}</span>
                <span style={S.blueTag}>{m.country}</span>
                <div style={S.cardTitle}>{m.name}</div>
              </div>
              <CopyBtn text={`${m.name}\nPhone: ${m.phone}\nVHF: Ch.${m.vhf}\nEmail: ${m.email}`} id={`mrcc-${i}`} copy={copy} copiedId={copiedId} />
            </div>
            <div style={S.cardMeta}>
              <div>📻 VHF Ch. <strong style={{ color: "#ef4444" }}>{m.vhf}</strong> &nbsp;|&nbsp; {m.callsign}</div>
              <div>📞 {m.phone}</div>
              {m.email && <div>✉ {m.email}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TMAS DIRECTORY ──
function TmasSection() {
  const { copy, copiedId } = useCopyToClipboard();
  return (
    <div style={S.grid2}>
      {TMAS_DIRECTORY.map((t, i) => (
        <div key={i} style={{ ...S.card, borderColor: "#1f2f1f" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={S.greenTag}>TMAS</span>
              <span style={S.blueTag}>{t.region}</span>
              <div style={S.cardTitle}>{t.name}</div>
            </div>
            <CopyBtn text={`${t.name}\nPhone: ${t.phone}\nEmail: ${t.email}\nCoverage: ${t.coverage}`} id={`tmas-${i}`} copy={copy} copiedId={copiedId} />
          </div>
          <div style={S.cardMeta}>
            <div>📞 <strong style={{ color: "#4ade80" }}>{t.phone}</strong> — {t.available}</div>
            <div>🌐 Coverage: {t.coverage}</div>
            <div>✉ {t.email}</div>
            <div style={{ color: "#555", marginTop: "4px" }}>ℹ {t.notes}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── DPA CONTACTS ──
function DpaSection() {
  const STORAGE_KEY = "emergency_dpa_contacts";
  const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } };
  const [contacts, setContacts] = useState(load);
  const [form, setForm] = useState({ company: "", name: "", role: "DPA", phone: "", mobile: "", email: "", notes: "" });
  const [editing, setEditing] = useState(null);
  const { copy, copiedId } = useCopyToClipboard();

  const save = (list) => { setContacts(list); localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); };
  const handleAdd = () => {
    if (!form.company || !form.phone) return;
    if (editing !== null) {
      const updated = contacts.map((c, i) => i === editing ? form : c);
      save(updated); setEditing(null);
    } else {
      save([...contacts, form]);
    }
    setForm({ company: "", name: "", role: "DPA", phone: "", mobile: "", email: "", notes: "" });
  };
  const handleEdit = (i) => { setForm(contacts[i]); setEditing(i); };
  const handleDelete = (i) => { if (window.confirm("Delete this contact?")) save(contacts.filter((_, idx) => idx !== i)); };

  return (
    <div>
      <div style={S.dpaForm}>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#ef4444", marginBottom: "12px", letterSpacing: "1px" }}>
          {editing !== null ? "✏ EDIT CONTACT" : "+ ADD DPA / COMPANY CONTACT"}
        </div>
        <div style={S.grid2}>
          <div>
            <label style={S.label}>COMPANY NAME *</label>
            <input style={S.input} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Shipping Co. Ltd" />
            <label style={S.label}>CONTACT NAME</label>
            <input style={S.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Capt. John Smith" />
            <label style={S.label}>ROLE</label>
            <select style={{ ...S.select, width: "100%" }} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {["DPA", "Deputy DPA", "Fleet Manager", "Technical Superintendent", "Operations Manager", "Emergency Coordinator", "Other"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>OFFICE PHONE *</label>
            <input style={S.input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+65 XXXX XXXX" />
            <label style={S.label}>MOBILE / 24H</label>
            <input style={S.input} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="+65 9XXX XXXX" />
            <label style={S.label}>EMAIL</label>
            <input style={S.input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="dpa@company.com" />
            <label style={S.label}>NOTES</label>
            <input style={S.input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="After-hours, backup contact, etc." />
          </div>
        </div>
        <button style={S.btn()} onClick={handleAdd}>{editing !== null ? "UPDATE CONTACT" : "SAVE CONTACT"}</button>
        {editing !== null && <button style={S.btn("#374151")} onClick={() => { setEditing(null); setForm({ company: "", name: "", role: "DPA", phone: "", mobile: "", email: "", notes: "" }); }}>CANCEL</button>}
      </div>

      {contacts.length === 0 && (
        <div style={{ textAlign: "center", color: "#444", fontSize: "12px", padding: "30px" }}>No company contacts saved. Add your DPA above.</div>
      )}
      <div style={S.grid2}>
        {contacts.map((c, i) => (
          <div key={i} style={{ ...S.card, borderColor: "#2a1a00" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ ...S.redTag, background: "#1a0f00", borderColor: "#d97706", color: "#d97706" }}>{c.role}</span>
                <div style={S.cardTitle}>{c.company}</div>
                {c.name && <div style={{ fontSize: "12px", color: "#aaa" }}>{c.name}</div>}
              </div>
              <div>
                <CopyBtn text={`${c.company} — ${c.role}\n${c.name || ""}\nPhone: ${c.phone}\nMobile: ${c.mobile}\nEmail: ${c.email}`} id={`dpa-${i}`} copy={copy} copiedId={copiedId} />
              </div>
            </div>
            <div style={{ ...S.cardMeta, marginTop: "8px" }}>
              {c.phone && <div>📞 {c.phone}</div>}
              {c.mobile && <div>📱 <strong style={{ color: "#d97706" }}>{c.mobile}</strong> (24h)</div>}
              {c.email && <div>✉ {c.email}</div>}
              {c.notes && <div style={{ color: "#555", marginTop: "4px" }}>ℹ {c.notes}</div>}
            </div>
            <div style={{ marginTop: "10px" }}>
              <button style={S.btn("#1f2937")} onClick={() => handleEdit(i)}>EDIT</button>
              <button style={{ ...S.btn("#1f0000"), color: "#ef4444" }} onClick={() => handleDelete(i)}>DELETE</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ITF INSPECTOR FINDER ──
function ItfSection() {
  const [country, setCountry] = useState("All Countries");
  const [search, setSearch] = useState("");
  const { copy, copiedId } = useCopyToClipboard();

  const filtered = ITF_INSPECTORS.filter((i) => {
    const matchCountry = country === "All Countries" || i.country === country;
    const matchSearch = !search || i.port.toLowerCase().includes(search.toLowerCase()) || i.country.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase());
    return matchCountry && matchSearch;
  });

  return (
    <div>
      <div style={{ ...S.card, borderColor: "#1a2a3a", marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", color: "#60a5fa", marginBottom: "4px", fontWeight: "700" }}>ℹ ITF INFORMATION</div>
        <div style={{ fontSize: "11px", color: "#666", lineHeight: "1.7" }}>
          The International Transport Workers' Federation (ITF) runs campaigns against substandard shipping. If you are a seafarer experiencing wage theft, unsafe conditions, abandonment, or document withholding — contact the nearest ITF inspector immediately. Inspections are free and confidential.
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
        <input style={{ ...S.input, width: "200px", marginBottom: 0 }} placeholder="Search port / country..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={S.select} value={country} onChange={(e) => setCountry(e.target.value)}>
          {ALL_COUNTRIES_ITF.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: "11px", color: "#555", alignSelf: "center" }}>{filtered.length} inspector offices</span>
      </div>
      <div style={S.grid2}>
        {filtered.map((itf, i) => (
          <div key={i} style={{ ...S.card, borderColor: "#001a2f" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={S.blueTag}>{itf.country}</span>
                <div style={S.cardTitle}>{itf.name}</div>
                <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>⚓ {itf.port}</div>
              </div>
              <CopyBtn text={`${itf.name}\nPort: ${itf.port}\nPhone: ${itf.phone}\nEmail: ${itf.email}\nAddress: ${itf.address}`} id={`itf-${i}`} copy={copy} copiedId={copiedId} />
            </div>
            <div style={S.cardMeta}>
              <div>📞 {itf.phone}</div>
              <div>✉ {itf.email}</div>
              <div style={{ color: "#555" }}>📍 {itf.address}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FLAG STATE CONTACTS ──
function FlagStateSection() {
  const [search, setSearch] = useState("");
  const { copy, copiedId } = useCopyToClipboard();
  const filtered = FLAG_STATES.filter((f) => !search || f.flag.toLowerCase().includes(search.toLowerCase()) || f.authority.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <input style={{ ...S.input, maxWidth: "280px" }} placeholder="Search flag state..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div style={S.grid2}>
        {filtered.map((f, i) => (
          <div key={i} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={S.redTag}>🏴 {f.flag}</span>
                <div style={S.cardTitle}>{f.authority}</div>
              </div>
              <CopyBtn text={`${f.flag} Flag State\n${f.authority}\nPhone: ${f.phone}\nEmergency: ${f.emergency}\nEmail: ${f.email}\nWeb: ${f.website}`} id={`flag-${i}`} copy={copy} copiedId={copiedId} />
            </div>
            <div style={S.cardMeta}>
              <div>📞 {f.phone}</div>
              <div>🚨 Emergency: <strong style={{ color: "#ef4444" }}>{f.emergency}</strong></div>
              <div>✉ {f.email}</div>
              <div>🌐 {f.website}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── DISTRESS MESSAGES ──
function DistressSection() {
  const [active, setActive] = useState("MAYDAY");
  const [fields, setFields] = useState({});
  const { copy, copiedId } = useCopyToClipboard();
  const tmpl = DISTRESS_TEMPLATES[active];
  const generated = tmpl.template(fields[active] || {});
  const setField = (key, val) => setFields((f) => ({ ...f, [active]: { ...(f[active] || {}), [key]: val } }));

  return (
    <div>
      {/* Type selector */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
        {Object.entries(DISTRESS_TEMPLATES).map(([key, t]) => (
          <button key={key} style={{ ...S.btn(active === key ? t.color : "#1f1f1f"), border: `1px solid ${active === key ? t.color : "#333"}`, opacity: active === key ? 1 : 0.7 }} onClick={() => setActive(key)}>
            {key.replace("_", " ")}
          </button>
        ))}
      </div>

      <div style={S.grid2}>
        {/* Input panel */}
        <div>
          <div style={{ fontSize: "11px", color: "#666", marginBottom: "12px", letterSpacing: "1px" }}>FILL IN VESSEL DETAILS</div>
          {tmpl.fields.map((f) => (
            <div key={f.id}>
              <label style={S.label}>{f.label}</label>
              <input style={S.input} placeholder={f.placeholder} value={(fields[active] || {})[f.id] || ""} onChange={(e) => setField(f.id, e.target.value)} />
            </div>
          ))}
        </div>

        {/* Generated output */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <div style={{ fontSize: "11px", color: "#666", letterSpacing: "1px" }}>GENERATED MESSAGE</div>
            <CopyBtn text={generated} id="distress-msg" copy={copy} copiedId={copiedId} />
          </div>
          <textarea style={S.textarea} value={generated} readOnly />
          <div style={{ fontSize: "10px", color: "#555", marginTop: "6px" }}>
            ⚠ This is a reference template only. Always use correct vessel information and transmit on VHF Ch.16 / DSC.
          </div>
        </div>
      </div>

      {/* Reference card */}
      <div style={{ marginTop: "28px" }}>
        <div style={{ fontSize: "12px", fontWeight: "700", color: "#fff", letterSpacing: "2px", marginBottom: "14px", borderBottom: "1px solid #1f1f1f", paddingBottom: "8px" }}>
          DISTRESS PRIORITY REFERENCE
        </div>
        <div style={S.grid3}>
          {[
            { label: "MAYDAY", color: "#dc2626", priority: "1st", desc: "Grave & imminent danger to vessel or persons. Full SAR response.", freq: "VHF Ch.16 / DSC Ch.70 / 2182 kHz" },
            { label: "PAN PAN", color: "#d97706", priority: "2nd", desc: "Urgent — not immediately life-threatening. Medical, MOB, mechanical.", freq: "VHF Ch.16 / DSC Ch.70" },
            { label: "SÉCURITÉ", color: "#2563eb", priority: "3rd", desc: "Safety/navigation warning. Unlit vessel, debris, ice, weather.", freq: "VHF Ch.16 after Annc. on Ch.70" },
          ].map((r) => (
            <div key={r.label} style={{ ...S.card, borderColor: r.color + "66" }}>
              <div style={{ fontSize: "16px", fontWeight: "800", color: r.color, letterSpacing: "2px" }}>{r.label}</div>
              <div style={{ fontSize: "10px", color: "#666", marginBottom: "6px" }}>Priority: {r.priority}</div>
              <div style={{ fontSize: "11px", color: "#aaa", lineHeight: "1.6", marginBottom: "6px" }}>{r.desc}</div>
              <div style={{ fontSize: "10px", color: r.color }}>📻 {r.freq}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── EMERGENCY SIGNALS ──
function SignalsSection() {
  return (
    <div>
      {EMERGENCY_SIGNALS.map((cat) => (
        <div key={cat.category} style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#ef4444", letterSpacing: "2px", marginBottom: "12px", paddingBottom: "6px", borderBottom: "1px solid #1f1f1f" }}>
            {cat.category.toUpperCase()}
          </div>
          <div style={S.grid3}>
            {cat.signals.map((sig, i) => (
              <div key={i} style={S.signalCard}>
                <div style={S.signalIcon}>{sig.icon}</div>
                <div>
                  <div style={S.signalName}>{sig.name}</div>
                  <div style={S.signalDesc}>{sig.description}</div>
                  <span style={{ ...S.blueTag, fontSize: "9px" }}>{sig.regulation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── PHRASEBOOK ──
function PhrasebookSection() {
  const [activeCategory, setActiveCategory] = useState(PHRASEBOOK[0].category);
  const { copy, copiedId } = useCopyToClipboard();
  const current = PHRASEBOOK.find((p) => p.category === activeCategory);

  return (
    <div>
      <div style={{ display: "flex", overflowX: "auto", gap: "6px", marginBottom: "20px", paddingBottom: "4px" }}>
        {PHRASEBOOK.map((p) => (
          <button key={p.category} style={{ ...S.btn(activeCategory === p.category ? "#dc2626" : "#1f1f1f"), flexShrink: 0, border: `1px solid ${activeCategory === p.category ? "#ef4444" : "#333"}`, fontSize: "10px" }} onClick={() => setActiveCategory(p.category)}>
            {p.category.toUpperCase()}
          </button>
        ))}
      </div>
      {current?.phrases.map((ph, i) => (
        <div key={i} style={S.phraseRow}>
          <div style={{ flex: 1 }}>
            <div style={S.phraseText}>"{ph.phrase}"</div>
            <div style={S.phraseUse}>{ph.use}</div>
          </div>
          <CopyBtn text={ph.phrase} id={`phrase-${i}`} copy={copy} copiedId={copiedId} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
const TABS = [
  { id: "gps", label: "📍 GPS Contacts", icon: "📍" },
  { id: "mrcc", label: "🗼 MRCC", icon: "🗼" },
  { id: "tmas", label: "🏥 TMAS", icon: "🏥" },
  { id: "dpa", label: "🏢 DPA", icon: "🏢" },
  { id: "itf", label: "⚓ ITF", icon: "⚓" },
  { id: "flag", label: "🏴 Flag State", icon: "🏴" },
  { id: "distress", label: "📡 Distress", icon: "📡" },
  { id: "signals", label: "🚨 Signals", icon: "🚨" },
  { id: "phrases", label: "💬 Phrasebook", icon: "💬" },
];

const SECTION_META = {
  gps: { title: "Emergency Contacts by GPS", icon: "📍", subtitle: "Auto-detect nearest MRCC based on your current position" },
  mrcc: { title: "MRCC Directory", icon: "🗼", subtitle: "Maritime Rescue Coordination Centres worldwide" },
  tmas: { title: "TMAS Directory", icon: "🏥", subtitle: "Telemedical Assistance Services — 24/7 medical advice at sea" },
  dpa: { title: "Company DPA Contacts", icon: "🏢", subtitle: "Designated Person Ashore — your saved company emergency contacts" },
  itf: { title: "ITF Inspector Finder", icon: "⚓", subtitle: "International Transport Workers' Federation — seafarer rights & assistance" },
  flag: { title: "Flag State Authority Contacts", icon: "🏴", subtitle: "Flag administration emergency contacts worldwide" },
  distress: { title: "Distress Message Formats", icon: "📡", subtitle: "MAYDAY / PAN PAN / SÉCURITÉ — fill-in templates + reference cards" },
  signals: { title: "Emergency Signal Reference", icon: "🚨", subtitle: "SOLAS / COLREGS visual, sound, and electronic distress signals" },
  phrases: { title: "Emergency Phrasebook", icon: "💬", subtitle: "Standard maritime phrases for emergencies and SAR coordination" },
};

export default function EmergencyPage() {
  const [activeTab, setActiveTab] = useState("gps");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const sectionRefs = useRef({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scrollToSection = (id) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleTabClick = (id) => {
    setActiveTab(id);
    if (!isMobile) scrollToSection(id);
  };

  const renderSection = (id) => {
    const meta = SECTION_META[id];
    const content = {
      gps: <GpsSection />,
      mrcc: <MrccSection />,
      tmas: <TmasSection />,
      dpa: <DpaSection />,
      itf: <ItfSection />,
      flag: <FlagStateSection />,
      distress: <DistressSection />,
      signals: <SignalsSection />,
      phrases: <PhrasebookSection />,
    }[id];

    return (
      <div
        key={id}
        id={`section-${id}`}
        ref={(el) => { sectionRefs.current[id] = el; }}
        style={S.section}
      >
        <div style={S.sectionHeader}>
          <span style={S.sectionIcon}>{meta.icon}</span>
          <div>
            <div style={S.sectionTitle}>{meta.title}</div>
            <div style={S.sectionSubtitle}>{meta.subtitle}</div>
          </div>
        </div>
        {content}
      </div>
    );
  };

  return (
    <div style={S.page}>
      {/* Keyframe injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        @keyframes sosPulse {
          0%, 100% { box-shadow: 0 0 18px #dc262680, 0 0 4px #dc262640; }
          50% { box-shadow: 0 0 32px #dc2626cc, 0 0 12px #ef444466; }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #1f1f1f; border-radius: 4px; }
        input:focus, select:focus, textarea:focus { border-color: #dc2626 !important; }
        @media (max-width: 767px) {
          .desktop-scroll-sections { display: none !important; }
          .mobile-active-section { display: block !important; }
        }
        @media (min-width: 768px) {
          .desktop-scroll-sections { display: block !important; }
          .mobile-active-section { display: none !important; }
          .tab-bar-scroll { display: none !important; }
        }
      `}</style>

      {/* SOS Banner */}
      <div style={S.sosBar}>
        <div style={S.sosLeft}>
          <div style={S.sosBtn}>🆘 SOS</div>
          <div>
            <div style={S.sosTitle}>EMERGENCY REFERENCE</div>
            <div style={S.sosSubtitle}>MRCC · TMAS · DPA · ITF · FLAG STATE · SAR SIGNALS</div>
          </div>
        </div>
        <div style={S.gpsBadge}>
          <span>🛰</span>
          <span>VHF Ch.16 — Global Distress Frequency</span>
        </div>
      </div>

      {/* Tab bar — mobile only */}
      <div className="tab-bar-scroll" style={S.tabBar}>
        {TABS.map((t) => (
          <button key={t.id} style={S.tab(activeTab === t.id)} onClick={() => handleTabClick(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Desktop — all sections scrollable */}
      <div className="desktop-scroll-sections">
        {TABS.map((t) => renderSection(t.id))}
      </div>

      {/* Mobile — only active section */}
      <div className="mobile-active-section" style={{ display: "none" }}>
        {renderSection(activeTab)}
      </div>
    </div>
  );
}
