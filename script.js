// Environmental Risk Model
// Kevin Fredericks 2020
// MIT License

// CONSTANTS
var HIGH_TEMP = 33;
var HIGH_HERBACEOUS = 55;
var NLCD_RESIDENTIAL = 21;
var HERBACEOUS_DATE = Date.parse('2016-01-01');
var DATE_START = addDays(Date.now(), -365);
var DATE_END = Date.now();
var SELECTED_DATE = Date.now();
var DATE_TEST = Date.parse('2019-01-01');
var HIGHLIGHT = 'red';

// DATA SOURCES //
// USGS Land Cover Map
var nlcd = ee.ImageCollection("USGS/NLCD");
// Global Forecast System
var gfs = ee.ImageCollection('NOAA/GFS0P25');

// USER INTERFACE //
// Construct DateSlider
var dateSlider = ui.DateSlider( DATE_START, DATE_END );
dateSlider.onChange( function() {
  SELECTED_DATE = dateSlider.getValue()[0];
})
// Construct Buttons
var testButton = ui.Button('BURNED AREAS');
testButton.onClick( function() {
  displayTest(DATE_TEST, WESTERN);
});
var litterButton = ui.Button('AT RISK AREAS');
litterButton.onClick( function() {
  var highRiskImage = getHighRiskImage(SELECTED_DATE, WESTERN);
  display(highRiskImage);
});
var forestButton = ui.Button('FOREST DENSITY');
forestButton.onClick( function() {
  var forestImage = getForestImage(SELECTED_DATE, WESTERN);
});

// Display GUI
Map.add(dateSlider);
Map.add(testButton);
Map.add(litterButton);
Map.add(forestButton);


// FUNCTIONS //

function getArea(image, geometry) {
  var count = image.eq([0]);
  var total = count.multiply(ee.Image.pixelArea());
  var area = total.reduceRegion({
    reducer:ee.Reducer.sum(),
    geometry: geometry,
    scale:1000,
    maxPixels: 1e9,
    bestEffort:true,
    tileScale:16
  });
  var areaPixels = ee.Number(area);
  return areaPixels;
}

function display(image) {
  // Display map with highlighted areas
  var visParams = {
    palette: HIGHLIGHT,
    opacity: 0.5
  };
  Map.addLayer( image, visParams, 'highTemps');
}

function displayTest(date, geometry) {
  var atRiskImage = getHighRiskImage(date, geometry).clip(geometry);
  var burnedImage = getBurnedImage(date, geometry).clip(geometry);
  
  var totalAtRisk = getArea(atRiskImage, geometry);
  var totalBurned = getArea(burnedImage, geometry);
  var totalAccurate = getArea( atRiskImage.mask(burnedImage));
  
  HIGHLIGHT = 'blue';
  display(atRiskImage);
  HIGHLIGHT = 'red';
  display(burnedImage);
}

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function parseUTC(timestamp) {
  var date = new Date(timestamp);
  return date;
}

// ImageCollection Functions //

function getHighRiskImage(date, geometry) {

  var groundLitter = getLitterImage(date, geometry);
  var hotSpots = getTemperatureImage(date, geometry);
  
  // Define intersection of shrub and high temperature
  var shrubAtHighRisk = hotSpots.mask( groundLitter ).gt(1);
  
  return shrubAtHighRisk;
}

function getTemperatureImage(temperatureDate, geometry) {
  // Define current temperature predictions
  var temperature = gfs
    .filterDate(temperatureDate)
    .select('temperature_2m_above_ground')
    .max();
  var temperatureHigh = temperature.gt(HIGH_TEMP);
  print('Temperatures: ');
  print(temperatureHigh);
  
  return temperatureHigh;
}

function getLitterImage(date, geometry) {
  // Define shrubland values
  var herbaceous = nlcd
      .filterDate(HERBACEOUS_DATE, addDays(HERBACEOUS_DATE, 365))
      .select( 'shrubland_litter' )
      .first();
  var herbaceousHigh = herbaceous.gt( HIGH_HERBACEOUS );
  print('Herbacity: ');
  print(herbaceousHigh);
  
  return herbaceousHigh;
}

function getForestImage(date, geometry) {
  // Define shrubland values
  var forest = nlcd
      .filterDate(HERBACEOUS_DATE, addDays(HERBACEOUS_DATE, 365))
      .select('percent_tree_cover')
      .first();

  print('Forest Cover: ');
  print(forest);
  Map.addLayer(forest, {palette: ['white', 'green'], max: 80}, 'forested areas');
  
  //return forest;
}

function getBurnedImage(date, geometry) {
  var burnedImage = ee.ImageCollection('MODIS/006/MOD14A1')
    .filterBounds(geometry)
    .filterDate(addDays(date, -365), date)
    .select('MaxFRP')
    .max();
    
  return burnedImage;
}