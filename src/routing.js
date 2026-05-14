/* eslint-disable */
import { recalcWaypoints, haversine, greatCircle } from './utils';
import { PORTS_DB } from './constants';

// ─── SEA CORRIDORS ────────────────────────────────────────────────────────────
export const SEA_WP = {
  // ── Suez Canal & Red Sea
  SUEZ_N:{lat:31.27,lon:32.33,name:"SUEZ N"},
  SUEZ_S:{lat:29.92,lon:32.55,name:"SUEZ S"},
  RED_N:{lat:29.77,lon:32.55,name:"RED N"},
  RED_CN:{lat:28.16,lon:33.28,name:"RED CN"},
  RED_CS:{lat:22.29,lon:38.88,name:"RED CS"},
  RED_S:{lat:15.0,lon:41.5,name:"RED S"},
  BAB:{lat:12.58,lon:43.38,name:"BAB"},
  ADEN_G:{lat:11.8,lon:45.5,name:"ADEN G"},
  // ── Persian Gulf & Arabian Sea
  HORMUZ:{lat:26.58,lon:56.35,name:"HORMUZ"},
  HORMUZ_E:{lat:23.5,lon:59.0,name:"HORMUZ E"},
  IND_W:{lat:12.0,lon:62.0,name:"IND W"},
  IND_C:{lat:4.0,lon:73.0,name:"IND C"},
  SOCOTRA:{lat:12.0,lon:54.0,name:"SOCOTRA"},
  // ── India Coastal Corridor
  IND_W_COAST:{lat:14.0,lon:73.0,name:"IND W COAST"},
  LAKSHADWEEP:{lat:10.0,lon:71.0,name:"LAKSHADWEEP"},
  IND_SW:{lat:10.0,lon:74.8,name:"IND SW"},
  IND_TIP_W:{lat:7.5,lon:76.5,name:"IND TIP W"},
  IND_TIP:{lat:6.0,lon:77.5,name:"IND TIP"},
  PALK_W:{lat:7.5,lon:78.8,name:"PALK W"},
  LANKA_SW:{lat:5.8,lon:79.8,name:"LANKA SW"},
  LANKA_S:{lat:5.4,lon:80.6,name:"LANKA S"},
  LANKA_SE:{lat:6.0,lon:82.0,name:"LANKA SE"},
  IND_NE:{lat:8.5,lon:84.5,name:"IND NE"},
  IND_E_COAST:{lat:12.0,lon:81.5,name:"IND E COAST"},
  // ── Bay of Bengal & Andaman Sea
  BAY_SW:{lat:10.0,lon:83.0,name:"BAY SW"},
  BAY_C:{lat:13.5,lon:87.0,name:"BAY C"},
  BAY_N:{lat:18.0,lon:90.0,name:"BAY N"},
  ANDAMAN_W:{lat:11.0,lon:92.0,name:"ANDAMAN W"},
  ANDAMAN:{lat:10.5,lon:94.0,name:"ANDAMAN"},
  ANDAMAN_S:{lat:6.5,lon:95.0,name:"ANDAMAN S"},
  // ── Malacca & Singapore Strait (IMO TSS data)
  MALACCA_NW:{lat:6.5,lon:98.8,name:"MALACCA NW"},
  MALACCA_N:{lat:3.09,lon:101.02,name:"MALACCA N"},
  MALACCA_C1:{lat:2.9,lon:100.67,name:"MALACCA C1"},
  MALACCA_C:{lat:2.33,lon:101.35,name:"MALACCA C"},
  MALACCA_S1:{lat:1.83,lon:101.8,name:"MALACCA S1"},
  MALACCA_S2:{lat:1.56,lon:102.39,name:"MALACCA S2"},
  MALACCA_S3:{lat:1.15,lon:103.41,name:"MALACCA S3"},
  MALACCA_S:{lat:1.18,lon:103.82,name:"MALACCA S"},
  // ── South China Sea & SE Asia
  S_CHINA_N:{lat:14.0,lon:112.0,name:"S CHINA N"},
  S_CHINA_S:{lat:3.0,lon:108.0,name:"S CHINA S"},
  PHILIP:{lat:10.0,lon:122.0,name:"PHILIP"},
  LOMBOK:{lat:-8.5,lon:115.8,name:"LOMBOK"},
  SUNDA:{lat:-6.1,lon:105.7,name:"SUNDA"},
  TIMOR:{lat:-9.5,lon:127.0,name:"TIMOR"},
  ARAFURA:{lat:-12.0,lon:136.0,name:"ARAFURA"},
  TORRES:{lat:-10.5,lon:142.5,name:"TORRES"},
  AUS_N:{lat:-12.0,lon:127.0,name:"AUS N"},
  AUS_W:{lat:-25.0,lon:108.0,name:"AUS W"},
  // ── Far East
  EAST_CHINA:{lat:27.0,lon:124.0,name:"EAST CHINA"},
  EAST_CHINA_N:{lat:37.57,lon:122.61,name:"EAST CHINA N"},
  EAST_CHINA2:{lat:31.0,lon:124.0,name:"EAST CHINA2"},
  KOREA_STR:{lat:34.5,lon:129.0,name:"KOREA STR"},
  JAPAN_SEA:{lat:37.0,lon:132.0,name:"JAPAN SEA"},
  TSUGARU:{lat:41.5,lon:140.8,name:"TSUGARU"},
  // ── Mediterranean
  GIBRALTAR:{lat:35.98,lon:-5.5,name:"GIBRALTAR"},
  MED_W:{lat:37.5,lon:5.0,name:"MED W"},
  MED_C:{lat:37.5,lon:15.0,name:"MED C"},
  MED_E:{lat:34.5,lon:24.0,name:"MED E"},
  BLACK_W:{lat:43.0,lon:29.0,name:"BLACK W"},
  // ── N.Europe
  BASC:{lat:47.0,lon:-5.0,name:"BASC"},
  DOVER:{lat:51.05,lon:1.5,name:"DOVER"},
  NORTH_SEA:{lat:56.0,lon:3.0,name:"NORTH SEA"},
  BALTIC_E:{lat:59.0,lon:21.5,name:"BALTIC E"},
  // ── Atlantic Ocean
  ATLANTIC_N:{lat:45.0,lon:-30.0,name:"ATLANTIC N"},
  ATLANTIC_C:{lat:20.0,lon:-35.0,name:"ATLANTIC C"},
  ATLANTIC_S:{lat:-15.0,lon:-20.0,name:"ATLANTIC S"},
  ATLANTIC_SW:{lat:-40.0,lon:-40.0,name:"ATLANTIC SW"},
  // ── Australia & Pacific
  AUS_SE:{lat:-38.5,lon:148.2,name:"AUS SE"},
  CORAL:{lat:-18.0,lon:152.0,name:"CORAL"},
  TASMAN:{lat:-38.0,lon:157.0,name:"TASMAN"},
  NZ_N:{lat:-38.52,lon:174.63,name:"NZ N"},
  NZ_S:{lat:-39.89,lon:174.91,name:"NZ S"},
  PAC_NW:{lat:48.0,lon:-160.0,name:"PAC NW"},
  PAC_NE:{lat:40.0,lon:-150.0,name:"PAC NE"},
  PAC_C:{lat:5.0,lon:-140.0,name:"PAC C"},
  PAC_SW:{lat:-20.0,lon:170.0,name:"PAC SW"},
  PAC_SE:{lat:-20.0,lon:-90.0,name:"PAC SE"},
  // ── Caribbean & Gulf of Mexico
  CARIB:{lat:15.0,lon:-75.0,name:"CARIB"},
  GULF_MEX:{lat:28.88,lon:-90.02,name:"GULF MEX"},
  PANAMA_CH:{lat:7.0,lon:-81.83,name:"PANAMA CH"},
  PANAMA_A:{lat:9.38,lon:-79.9,name:"PANAMA A"},
  PANAMA_P:{lat:8.9,lon:-79.5,name:"PANAMA P"},
  // ── US East Coast
  US_NE:{lat:40.45,lon:-73.68,name:"US NE"},
  US_BOSTON:{lat:42.36,lon:-70.92,name:"US BOSTON"},
  US_SE:{lat:36.93,lon:-75.92,name:"US SE"},
  // ── US West Coast
  US_PNW:{lat:48.19,lon:-122.78,name:"US PNW"},
  US_CA:{lat:33.74,lon:-118.27,name:"US CA"},
  // ── S.America
  CALLAO:{lat:-12.03,lon:-77.23,name:"CALLAO"},
  ANTOF:{lat:-23.63,lon:-70.49,name:"ANTOF"},
  VALP:{lat:-32.74,lon:-71.53,name:"VALP"},
  ILO:{lat:-18.47,lon:-70.42,name:"ILO"},
  CAPE_HORN:{lat:-56.0,lon:-67.5,name:"CAPE HORN"},
  // ── Africa
  CANARY:{lat:28.04,lon:-15.07,name:"CANARY"},
  AFR_W:{lat:5.0,lon:-5.0,name:"AFR W"},
  AFR_E:{lat:-10.0,lon:43.0,name:"AFR E"},
  CAPE_GH:{lat:-34.5,lon:18.0,name:"CAPE GH"},
  IND_SW2:{lat:-25.0,lon:40.0,name:"IND SW2"},
  // ── Indian Ocean
  IND_S:{lat:-30.0,lon:65.0,name:"IND S"},
  IND_OCEAN_SE:{lat:-15.0,lon:80.0,name:"IND OCEAN SE"},
};

// ─── PORT EXIT CORRIDORS ──────────────────────────────────────────────────────
export const PORT_EXIT = {
  MUM:  ['IND_W_COAST','IND_SW','IND_TIP_W','IND_TIP','PALK_W'],
  KAN:  ['LAKSHADWEEP','IND_SW','IND_TIP_W','IND_TIP','PALK_W'],
  KOC:  ['IND_SW','IND_TIP_W','IND_TIP','PALK_W'],
  MOR:  ['IND_W_COAST','IND_SW','IND_TIP_W','IND_TIP','PALK_W'],
  NEW:  ['IND_W_COAST','IND_SW','IND_TIP_W','IND_TIP','PALK_W'],
  CHE:  ['IND_E_COAST'],
  VIS:  ['IND_E_COAST'],
  PAR:  ['BAY_SW'],
  HAL:  ['BAY_N','BAY_C'],
  ENN:  ['IND_E_COAST'],
  COL:  ['PALK_W','LANKA_SW','LANKA_S'],
  TRI:  ['LANKA_SE','LANKA_S'],
  HAM2: ['LANKA_S'],
  KAR:  ['IND_W'],
  QPQ:  ['IND_W'],
  GWD:  ['HORMUZ_E','IND_W'],
  DXB:  ['HORMUZ'],
  AUH:  ['HORMUZ'],
  FUJ:  [],
  SHJ:  ['HORMUZ'],
  MCT:  [],
  DOH:  ['HORMUZ'],
  RKH:  ['HORMUZ'],
  BAH:  ['HORMUZ'],
  KWI:  ['HORMUZ'],
  JED:  ['RED_S'],
  YAN:  ['RED_N'],
  JUB:  ['HORMUZ'],
  BAS:  ['HORMUZ'],
  UMQ:  ['HORMUZ'],
  BND:  ['HORMUZ'],
  SIN:  [],
  LEM:  ['MALACCA_S','MALACCA_S3','MALACCA_S2','MALACCA_S1'],
  BKK:  ['MALACCA_S','MALACCA_S3','MALACCA_S2','MALACCA_S1'],
  PKL:  ['MALACCA_S','MALACCA_S3','MALACCA_S2','MALACCA_S1'],
  JHB:  [],
  PGU:  ['MALACCA_N','MALACCA_C1','MALACCA_C'],
  CTG:  ['BAY_N'],
  MGL:  ['BAY_N'],
  RGN:  ['BAY_C','ANDAMAN_W'],
  SHA:  ['EAST_CHINA'],
  HKG:  ['S_CHINA_N'],
  SZX:  ['S_CHINA_N'],
  GZH:  ['S_CHINA_N'],
  NGB:  ['EAST_CHINA'],
  TJN:  ['EAST_CHINA','S_CHINA_N'],
  QIN:  ['EAST_CHINA'],
  DAL:  ['EAST_CHINA'],
};

// ─── ROUTE LOOKUP TABLE ───────────────────────────────────────────────────────
export const ROUTE_TABLE = {
  "MUM-SIN":[[18.93,72.83],[14.0,73.0],[10.0,74.8],[7.5,76.5],[6.0,77.5],[7.5,78.8],[5.8,79.8],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.9,98.5],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.83,101.8],[1.56,102.39],[1.15,103.41],[1.29,103.85]],
  "MUM-PKL":[[18.93,72.83],[14.0,73.0],[10.0,74.8],[7.5,76.5],[6.0,77.5],[7.5,78.8],[5.8,79.8],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.9,98.5],[5.0,99.2],[3.09,101.02],[2.9,100.67],[3.0,101.37]],
  "MUM-COL":[[18.93,72.83],[14.0,73.0],[10.0,74.8],[7.5,76.5],[7.5,78.8],[6.94,79.85]],
  "MUM-DXB":[[18.93,72.83],[20.0,65.0],[24.0,60.0],[26.58,56.35],[25.05,55.13]],
  "MUM-KAR":[[18.93,72.83],[22.0,70.5],[24.86,67.01]],
  "MUM-ROT":[[18.93,72.83],[14.0,73.0],[10.0,74.8],[7.5,76.5],[6.0,77.5],[7.5,78.8],[5.8,79.8],[5.4,80.6],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,15.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "SIN-SHA":[[1.29,103.85],[1.15,103.41],[3.0,108.0],[14.0,112.0],[22.0,117.0],[27.0,122.0],[31.23,121.47]],
  "SIN-HKG":[[1.29,103.85],[1.15,103.41],[3.0,108.0],[14.0,112.0],[22.29,114.16]],
  "SIN-MAN":[[1.29,103.85],[1.15,103.41],[3.0,108.0],[10.0,115.0],[14.59,120.98]],
  "SIN-BUS":[[1.29,103.85],[1.15,103.41],[3.0,108.0],[14.0,112.0],[27.0,122.0],[34.0,127.0],[35.1,129.04]],
  "SIN-YOK":[[1.29,103.85],[1.15,103.41],[3.0,108.0],[14.0,112.0],[22.0,117.0],[27.0,122.0],[34.0,132.0],[35.45,139.65]],
  "SIN-SYD":[[1.29,103.85],[3.0,108.0],[-8.5,115.8],[-18.0,120.0],[-30.0,135.0],[-33.86,151.21]],
  "SIN-COL":[[1.29,103.85],[1.15,103.41],[1.56,102.39],[2.33,101.35],[3.09,101.02],[5.9,98.5],[6.5,95.0],[8.5,84.5],[6.0,82.0],[5.4,80.6],[5.8,79.8],[6.94,79.85]],
  "SIN-MUM":[[1.29,103.85],[1.56,102.39],[2.33,101.35],[3.09,101.02],[5.0,99.2],[5.9,98.5],[6.5,95.0],[8.5,84.5],[6.0,82.0],[5.4,80.6],[5.8,79.8],[7.5,78.8],[6.0,77.5],[7.5,76.5],[10.0,74.8],[14.0,73.0],[18.93,72.83]],
  "SIN-DXB":[[1.29,103.85],[1.56,102.39],[2.33,101.35],[3.09,101.02],[5.9,98.5],[6.5,95.0],[8.5,84.5],[5.4,80.6],[6.0,77.5],[7.5,76.5],[10.0,74.8],[14.0,73.0],[18.93,72.83],[12.0,62.0],[12.0,50.0],[12.58,43.38],[12.0,62.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],
  "SIN-ROT":[[1.29,103.85],[1.56,102.39],[2.33,101.35],[3.09,101.02],[5.9,98.5],[6.5,95.0],[8.5,84.5],[5.4,80.6],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "DXB-SIN":[[25.05,55.13],[26.58,56.35],[23.5,59.0],[12.0,62.0],[10.0,65.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.9,98.5],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.56,102.39],[1.15,103.41],[1.29,103.85]],
  "DXB-ROT":[[25.05,55.13],[26.58,56.35],[23.5,59.0],[12.0,62.0],[12.0,50.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,15.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "DXB-MUM":[[25.05,55.13],[26.58,56.35],[23.5,59.0],[18.0,62.0],[14.0,67.0],[18.93,72.83]],
  "DXB-SHA":[[25.05,55.13],[26.58,56.35],[23.5,59.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.9,98.5],[3.09,101.02],[1.18,103.82],[3.0,108.0],[14.0,112.0],[27.0,122.0],[31.23,121.47]],
  "ROT-SIN":[[51.92,4.48],[51.9,3.0],[51.05,1.5],[48.0,-5.5],[45.0,-8.0],[40.0,-9.5],[36.5,-7.0],[35.98,-5.5],[37.5,5.0],[34.5,24.0],[31.27,32.33],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,50.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.9,98.5],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.56,102.39],[1.15,103.41],[1.29,103.85]],
  "ROT-SHA":[[51.92,4.48],[51.9,3.0],[51.05,1.5],[48.0,-5.5],[45.0,-8.0],[40.0,-9.5],[36.5,-7.0],[35.98,-5.5],[37.5,5.0],[34.5,24.0],[31.27,32.33],[29.77,32.55],[15.0,41.5],[12.58,43.38],[12.0,62.0],[8.5,84.5],[6.5,95.0],[3.09,101.02],[1.15,103.41],[3.0,108.0],[14.0,112.0],[27.0,122.0],[31.23,121.47]],
  "ROT-MUM":[[51.92,4.48],[51.9,3.0],[51.05,1.5],[48.0,-5.5],[45.0,-8.0],[40.0,-9.5],[36.5,-7.0],[35.98,-5.5],[34.5,24.0],[31.27,32.33],[29.77,32.55],[15.0,41.5],[12.58,43.38],[12.0,62.0],[14.0,67.0],[18.93,72.83]],
  "ROT-NYK":[[51.92,4.48],[51.9,3.0],[51.05,1.5],[48.0,-5.5],[45.0,-10.0],[42.0,-20.0],[42.0,-40.0],[42.0,-60.0],[40.65,-74.07]],
  "MUM-ROT":[[18.93,72.83],[14.0,67.0],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[36.5,-7.0],[40.0,-9.5],[45.0,-8.0],[48.0,-5.5],[51.05,1.5],[51.9,3.0],[51.92,4.48]],
  "SHA-ROT":[[31.23,121.47],[27.0,122.0],[14.0,112.0],[5.0,108.0],[1.15,103.41],[6.5,95.0],[8.5,84.5],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[36.5,-7.0],[40.0,-9.5],[45.0,-8.0],[48.0,-5.5],[51.05,1.5],[51.9,3.0],[51.92,4.48]],
  "HKG-ROT":[[22.29,114.16],[14.0,112.0],[3.0,108.0],[1.29,103.85],[6.5,95.0],[8.5,84.5],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[36.5,-7.0],[40.0,-9.5],[45.0,-8.0],[48.0,-5.5],[51.05,1.5],[51.9,3.0],[51.92,4.48]],
  "NYK-ROT":[[35.45,139.65],[40.0,-140.0],[45.0,-160.0],[48.0,170.0],[51.05,1.5],[51.92,4.48]],
  "NYK-LAX":[[35.45,139.65],[40.0,150.0],[48.0,170.0],[45.0,-160.0],[40.0,-140.0],[33.74,-118.27]],
  "LAX-YOK":[[33.74,-118.27],[40.0,-140.0],[45.0,-160.0],[48.0,170.0],[40.0,150.0],[35.45,139.65]],
  "LAX-SHA":[[33.74,-118.27],[40.0,-140.0],[45.0,-160.0],[48.0,170.0],[40.0,150.0],[35.45,139.65],[31.23,121.47]],
  "NYK-ROT2":[[35.45,139.65],[34.0,132.0],[27.0,122.0],[14.0,112.0],[3.0,108.0],[1.29,103.85],[6.5,95.0],[8.5,84.5],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[36.5,-7.0],[40.0,-9.5],[45.0,-8.0],[48.0,-5.5],[51.05,1.5],[51.92,4.48]],
  "COL-SIN":[[6.94,79.85],[5.8,79.8],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.9,98.5],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.56,102.39],[1.15,103.41],[1.29,103.85]],
  "COL-MUM":[[6.94,79.85],[7.5,78.8],[7.5,76.5],[10.0,74.8],[14.0,73.0],[18.93,72.83]],
  "KAR-SIN":[[24.86,67.01],[20.0,65.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85]],
  "KAR-DXB":[[24.86,67.01],[26.0,61.0],[26.58,56.35],[25.05,55.13]],
  "SHA-SIN":[[31.23,121.47],[27.0,122.0],[14.0,112.0],[5.0,108.0],[3.0,108.0],[1.15,103.41],[1.29,103.85]],
  "SHA-BUS":[[31.23,121.47],[34.0,127.0],[35.1,129.04]],
  "HKG-SIN":[[22.29,114.16],[14.0,112.0],[3.0,108.0],[1.29,103.85]],
  "BUS-SIN":[[35.1,129.04],[34.0,127.0],[27.0,122.0],[14.0,112.0],[3.0,108.0],[1.15,103.41],[1.29,103.85]],
  "BUS-SHA":[[35.1,129.04],[34.0,127.0],[27.0,122.0],[31.23,121.47]],
  "YOK-SIN":[[35.45,139.65],[34.0,132.0],[27.0,122.0],[14.0,112.0],[3.0,108.0],[1.15,103.41],[1.29,103.85]],
  "YOK-SHA":[[35.45,139.65],[34.0,132.0],[31.23,121.47]],
  "YOK-LAX":[[35.45,139.65],[40.0,150.0],[48.0,170.0],[45.0,-160.0],[40.0,-140.0],[33.74,-118.27]],
  "NYK-ROT":[[40.65,-74.07],[42.0,-60.0],[45.0,-30.0],[50.0,-10.0],[51.92,4.48]],
  "ROT-NYK":[[51.92,4.48],[50.0,-10.0],[45.0,-30.0],[42.0,-60.0],[40.65,-74.07]],
  "NYK-SIN":[[40.65,-74.07],[35.0,-73.0],[28.0,-80.0],[22.0,-80.0],[15.0,-75.0],[9.38,-79.9],[8.9,-79.5],[5.0,-85.0],[3.0,-85.0],[3.0,108.0],[1.29,103.85]],
  "MOM-MUM":[[-4.05,39.67],[-10.0,43.0],[8.0,60.0],[12.0,62.0],[14.0,67.0],[18.93,72.83]],
  "MOM-SIN":[[-4.05,39.67],[-10.0,43.0],[-15.0,55.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],
  "CHE-SIN":[[13.08,80.29],[10.0,81.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.29,103.85]],
  "CTG-SIN":[[22.34,91.82],[18.0,90.0],[13.5,87.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],
  "JAK-SIN":[[-6.11,106.88],[-6.1,105.7],[1.15,103.41],[1.29,103.85]],
  "SIN-JAK":[[1.29,103.85],[1.15,103.41],[-6.1,105.7],[-6.11,106.88]],
  "SYD-SIN":[[-33.86,151.21],[-30.0,135.0],[-18.0,120.0],[-8.5,115.8],[3.0,108.0],[1.29,103.85]],
  "SYD-SHA":[[-33.86,151.21],[-18.0,152.0],[-10.5,142.5],[3.0,130.0],[14.0,119.0],[22.0,117.0],[31.23,121.47]],
  "ADE-MUM":[[12.77,44.99],[12.58,43.38],[12.0,50.0],[12.0,62.0],[14.0,67.0],[18.93,72.83]],
  "ADE-SIN":[[12.77,44.99],[12.58,43.38],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],
  "PSD-DXB":[[31.26,32.31],[29.77,32.55],[15.0,41.5],[12.58,43.38],[12.0,50.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],
  "PSD-MUM":[[31.26,32.31],[29.77,32.55],[15.0,41.5],[12.58,43.38],[12.0,62.0],[14.0,67.0],[18.93,72.83]],
  "PSD-SIN":[[31.26,32.31],[29.77,32.55],[15.0,41.5],[12.58,43.38],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],
};

// ─── AUTO ROUTE — sea-lane routing with coastal avoidance ─────────────────────
export function buildAutoRoute(fromPort, toPort) {
  const from = PORTS_DB.find(p => p.id === fromPort);
  const to   = PORTS_DB.find(p => p.id === toPort);
  if (!from || !to) return [];

  const key  = `${fromPort}-${toPort}`;
  const keyR = `${toPort}-${fromPort}`;
  if (ROUTE_TABLE[key]) {
    const wps = ROUTE_TABLE[key].map(([lat,lon],i,arr) => ({
      lat,lon,
      name: i===0?from.name:i===arr.length-1?to.name:undefined,
    }));
    return recalcWaypoints(wps);
  }
  if (ROUTE_TABLE[keyR]) {
    const wps = [...ROUTE_TABLE[keyR]].reverse().map(([lat,lon],i,arr) => ({
      lat,lon,
      name: i===0?from.name:i===arr.length-1?to.name:undefined,
    }));
    return recalcWaypoints(wps);
  }

  const wps = [];
  const add = (...keys) => keys.forEach(k => { if(SEA_WP[k]) wps.push({...SEA_WP[k]}); });

  const isWestIndia  = p => p.lon>=69 && p.lon<77  && p.lat>=8  && p.lat<24;
  const isEastIndia  = p => p.lon>=77 && p.lon<88  && p.lat>=8  && p.lat<22;
  const isBayBengal  = p => p.lon>=79 && p.lon<99  && p.lat>=5  && p.lat<24;
  const isSriLanka   = p => p.lon>=79 && p.lon<82  && p.lat>=5  && p.lat<10;
  const isIndianOcn  = p => p.lon>=44 && p.lon<80  && p.lat>=-10&& p.lat<25;
  const isPersGulf   = p => p.lon>=48 && p.lon<58  && p.lat>22;
  const isRedSea     = p => p.lon>=32 && p.lon<44  && p.lat>=11 && p.lat<31;
  const isMalacca    = p => p.lon>=98 && p.lon<105 && p.lat>=1  && p.lat<8;
  const isSeAsia     = p => p.lon>=98 && p.lon<120 && p.lat>=-10&& p.lat<22;
  const isFarEast    = p => p.lon>=108&& p.lat>=-5 && p.lat<45;
  const isJapanKorea = p => p.lon>=120&& p.lat>=28 && p.lat<46;
  const isMed        = p => p.lon>-6  && p.lon<37  && p.lat>30  && p.lat<47;
  const isEurope     = p => (p.lon<20 && p.lat>40) || (p.lon>=-10&&p.lon<25&&p.lat>50);
  const isUKNorth    = p => p.lon>=-10&& p.lon<5   && p.lat>=55 && p.lat<62;
  const isBaltic     = p => p.lon>9   && p.lon<32  && p.lat>53  && p.lat<66;
  const isBlackSea   = p => p.lon>27  && p.lon<42  && p.lat>40  && p.lat<48;
  const isEAfrica    = p => p.lon>=36 && p.lon<52  && p.lat>=-30&& p.lat<15;
  const isWAfrica    = p => p.lon>=-20&& p.lon<10  && p.lat>=-10&& p.lat<20;
  const isEastUS     = p => p.lon>=-82&& p.lon<-65 && p.lat>=24 && p.lat<47;
  const isWestUS     = p => p.lon<=-100&&p.lat>=10 && p.lat<62;
  const isCarib      = p => p.lon>=-88&& p.lon<-60 && p.lat>=8  && p.lat<24;
  const isGulfMex    = p => p.lon>=-100&&p.lon<-80 && p.lat>=18 && p.lat<32;
  const isSAmer      = p => p.lon>=-85&& p.lon<-30 && p.lat<12;
  const isSAtl       = p => p.lon>=-55&& p.lon<20  && p.lat<-10;
  const isAustralia  = p => p.lon>=113&& p.lon<155 && p.lat>=-45&& p.lat<-10;
  const isPacific    = p => p.lon>155 || (p.lon<-130&& p.lat<-10);

  const fromExit = PORT_EXIT[from.id] || [];
  fromExit.forEach(k => { if(SEA_WP[k]) wps.push({...SEA_WP[k]}); });

  const fromWestIndia = isWestIndia(from) || (isPersGulf(from)&&!isSeAsia(to)&&!isFarEast(to));
  const toEastOfIndia = isEastIndia(to)||isBayBengal(to)||isSeAsia(to)||isFarEast(to)||isJapanKorea(to);
  const fromEastOfIndia = isEastIndia(from)||isBayBengal(from)||isSeAsia(from)||isFarEast(from);
  const toWestOfIndia = isWestIndia(to)||isIndianOcn(to)||isPersGulf(to)||isRedSea(to)||isEAfrica(to);
  const alreadyRoundedTip = fromExit.includes('IND_TIP') || fromExit.includes('IND_TIP_W');

  if(fromWestIndia && toEastOfIndia && !alreadyRoundedTip) {
    add('PALK_W','LANKA_SW','LANKA_S','LANKA_SE');
  }
  if(fromEastOfIndia && toWestOfIndia && !fromExit.includes('IND_TIP')) {
    add('LANKA_S','IND_TIP','IND_TIP_W');
  }

  const needsMalacca = (isIndianOcn(from)||isWestIndia(from)||isBayBengal(from)||isSriLanka(from)||isPersGulf(from)||isRedSea(from)||isEAfrica(from)||isMed(from)||isEurope(from)) &&
    (isSeAsia(to)||isFarEast(to)||isJapanKorea(to));
  const needsMalaccaRev = (isSeAsia(from)||isFarEast(from)||isJapanKorea(from)) &&
    (isIndianOcn(to)||isWestIndia(to)||isBayBengal(to)||isSriLanka(to)||isPersGulf(to)||isRedSea(to)||isEAfrica(to)||isMed(to)||isEurope(to));

  if(needsMalacca && !fromExit.some(k=>['MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S'].includes(k))) {
    if(!isBayBengal(from)&&!isEastIndia(from)) {
      add('PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE','ANDAMAN_W','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');
    } else {
      add('ANDAMAN_W','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');
    }
  }
  if(needsMalaccaRev) {
    if(!isBayBengal(to)&&!isEastIndia(to)) {
      add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','ANDAMAN_W','IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W');
    } else {
      add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','ANDAMAN_W');
    }
  }

  const needsSuez = (isMed(from)||isEurope(from)||isBaltic(from)||isUKNorth(from)||isBlackSea(from)) &&
    (isIndianOcn(to)||isPersGulf(to)||isEAfrica(to)||isBayBengal(to)||isSeAsia(to)||isFarEast(to)||isWestIndia(to)||isSriLanka(to));
  const needsSuezRev = (isMed(to)||isEurope(to)||isBaltic(to)||isUKNorth(to)||isBlackSea(to)) &&
    (isIndianOcn(from)||isPersGulf(from)||isEAfrica(from)||isBayBengal(from)||isSeAsia(from)||isFarEast(from)||isWestIndia(from)||isSriLanka(from));

  if(needsSuez){
    if(isBlackSea(from)) add('BLACK_W');
    if(isBaltic(from))   add('NORTH_SEA','DOVER','BASC','GIBRALTAR');
    if(isUKNorth(from))  add('NORTH_SEA','DOVER','BASC','GIBRALTAR');
    if(isEurope(from)&&!isMed(from)&&!isUKNorth(from)&&!isBaltic(from)) add('BASC','GIBRALTAR');
    add('MED_W','MED_E','SUEZ_N','SUEZ_S','RED_N','RED_S','BAB','ADEN_G','SOCOTRA');
    if(isPersGulf(to))   add('HORMUZ_E','HORMUZ');
    else if(isEAfrica(to)) add('AFR_E');
    else if(isWestIndia(to)||isIndianOcn(to)) add('IND_W');
    else if(isBayBengal(to)||isSriLanka(to))  add('IND_W','PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE');
    else if(isEastIndia(to)) add('IND_W','PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE','IND_E_COAST');
    else if(isSeAsia(to)||isFarEast(to)) add('IND_W','PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');
  }
  if(needsSuezRev){
    if(isPersGulf(from))     add('HORMUZ','HORMUZ_E');
    else if(isEAfrica(from)) add('AFR_E','IND_W');
    else if(isSeAsia(from)||isFarEast(from)) add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_W');
    else if(isBayBengal(from)||isEastIndia(from)) add('IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_W');
    else if(isWestIndia(from)) add('IND_W');
    add('SOCOTRA','ADEN_G','BAB','RED_S','RED_N','SUEZ_S','SUEZ_N','MED_E','MED_W');
    if(isBlackSea(to)) add('BLACK_W');
    if(isBaltic(to))   add('GIBRALTAR','BASC','DOVER','NORTH_SEA');
    if(isUKNorth(to))  add('GIBRALTAR','BASC','DOVER','NORTH_SEA');
    if(isEurope(to)&&!isMed(to)&&!isUKNorth(to)&&!isBaltic(to)) add('GIBRALTAR','BASC');
  }

  const needsCape = !needsSuez && !needsSuezRev && (
    ((isSAtl(from)||isWAfrica(from)||isSAmer(from))&&(isIndianOcn(to)||isEAfrica(to)||isSeAsia(to)||isFarEast(to)||isAustralia(to)))||
    ((isSAtl(to)||isWAfrica(to)||isSAmer(to))&&(isIndianOcn(from)||isEAfrica(from)||isSeAsia(from)||isFarEast(from)||isAustralia(from)))
  );
  if(needsCape){
    if(isIndianOcn(to)||isEAfrica(to)||isSeAsia(to)||isFarEast(to)||isAustralia(to)){
      add('ATLANTIC_S','CAPE_GH','IND_S','IND_SW2');
    } else {
      add('IND_SW2','IND_S','CAPE_GH','ATLANTIC_S');
    }
  }

  const needsPanama = !needsSuez && !needsSuezRev && (
    (isWestUS(from)&&(isEastUS(to)||isCarib(to)||isSAtl(to)||isEurope(to)||isWAfrica(to)))||
    ((isEastUS(from)||isCarib(from)||isSAtl(from))&&isWestUS(to))
  );
  if(needsPanama){
    if(isWestUS(to)){ add('CARIB','PANAMA_A','PANAMA_P'); }
    else             { add('PANAMA_P','PANAMA_A','CARIB'); }
  }

  const needsPacific    = (isFarEast(from)||isJapanKorea(from))&&(isWestUS(to)||isEastUS(to));
  const needsPacificRev = (isFarEast(to)||isJapanKorea(to))&&(isWestUS(from)||isEastUS(from));
  if(needsPacific)    add('PAC_NW','PAC_NE');
  if(needsPacificRev) add('PAC_NE','PAC_NW');

  const crossAtl = !needsPanama && !needsSuez && !needsSuezRev && !needsCape && (
    (isEurope(from)||(isEastUS(from)||isCarib(from))) && (isEurope(to)||isEastUS(to)||isCarib(to)||isWAfrica(to)||isSAmer(to))
  );
  if(crossAtl){
    if(isEurope(from)&&(isEastUS(to)||isCarib(to)))     add('BASC','ATLANTIC_N');
    else if((isEastUS(from)||isCarib(from))&&isEurope(to)) add('ATLANTIC_N','BASC');
    else if(isSAmer(to)||isSAtl(to))                    add('ATLANTIC_C','ATLANTIC_S');
    else if(isSAmer(from)||isSAtl(from))                add('ATLANTIC_S','ATLANTIC_C');
    else                                                 add('ATLANTIC_C');
  }

  if(!needsCape&&!needsSuez&&!needsSuezRev){
    if(isAustralia(from)&&(isSeAsia(to)||isFarEast(to))){
      if(from.lon>140)       add('TORRES','ARAFURA','TIMOR','LOMBOK','S_CHINA_S');
      else if(from.lat< -25) add('AUS_W','LOMBOK','S_CHINA_S');
      else                   add('AUS_N','TIMOR','LOMBOK','S_CHINA_S');
    }
    if(isAustralia(to)&&(isSeAsia(from)||isFarEast(from))){
      if(to.lon>140)         add('S_CHINA_S','LOMBOK','TIMOR','ARAFURA','TORRES');
      else if(to.lat< -25)   add('S_CHINA_S','LOMBOK','AUS_W');
      else                   add('S_CHINA_S','LOMBOK','TIMOR','AUS_N');
    }
    if(isAustralia(from)&&isEAfrica(to))   add('IND_S','IND_SW2','AFR_E');
    if(isEAfrica(from)&&isAustralia(to))   add('AFR_E','IND_SW2','IND_S');
    if(isAustralia(from)&&isPacific(to))   add('CORAL','TASMAN','PAC_SW');
    if(isPacific(from)&&isAustralia(to))   add('PAC_SW','TASMAN','CORAL');
  }

  if(!needsSuez&&!needsSuezRev&&!needsMalacca&&!needsMalaccaRev){
    if((isJapanKorea(from))&&isFarEast(to)&&!isJapanKorea(to)) add('EAST_CHINA');
    if((isJapanKorea(to))&&isFarEast(from)&&!isJapanKorea(from)) add('EAST_CHINA');
    const scsNeeded = (isSeAsia(from)&&(isFarEast(to)||isJapanKorea(to)))||
                      ((isFarEast(from)||isJapanKorea(from))&&isSeAsia(to));
    if(scsNeeded){
      if(isFarEast(to)||isJapanKorea(to)) add('S_CHINA_S','S_CHINA_N');
      else                                add('S_CHINA_N','S_CHINA_S');
    }
  }

  const toExit = PORT_EXIT[to.id] || [];
  const approachFromEast = isSeAsia(from)||isFarEast(from)||isBayBengal(from)||isEastIndia(from);
  if(isWestIndia(to) && approachFromEast) {
    const already = wps.some(w => w.name && (w.name.includes('Dondra')||w.name.includes('Lanka')||w.name.includes('Mannar')));
    if(!already) {
      ['LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_TIP','IND_TIP_W','IND_SW']
        .forEach(k => { if(SEA_WP[k]) wps.push({...SEA_WP[k]}); });
    }
  }

  const rawPoints = [
    {lat:from.lat, lon:from.lon, name:from.name},
    ...wps,
    {lat:to.lat,   lon:to.lon,   name:to.name},
  ];

  const deduped = rawPoints.filter((p,i) => {
    if(i===0) return true;
    const prev = rawPoints[i-1];
    return !(Math.abs(p.lat-prev.lat)<0.2 && Math.abs(p.lon-prev.lon)<0.2);
  });

  const allWPs = [];
  for(let i=0; i<deduped.length-1; i++){
    const a=deduped[i], b=deduped[i+1];
    const dist=haversine(a.lat,a.lon,b.lat,b.lon);
    const nPts=Math.max(2,Math.min(12,Math.floor(dist/200)));
    const seg=greatCircle(a.lat,a.lon,b.lat,b.lon,nPts);
    seg.forEach((pt,j) => {
      if(i>0&&j===0) return;
      allWPs.push({
        lat:Math.round(pt[0]*10000)/10000,
        lon:Math.round(pt[1]*10000)/10000,
        name:(j===0&&deduped[i].name)?deduped[i].name:undefined,
      });
    });
  }
  if(allWPs.length>0) allWPs[allWPs.length-1].name=to.name;
  return recalcWaypoints(allWPs);
    }
