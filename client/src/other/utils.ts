import { LatLng, Point, Polygon } from "leaflet";
import * as turf from "@turf/turf";
import { UnitDatabase } from "../unit/unitdatabase";
import { aircraftDatabase } from "../unit/aircraftdatabase";
import { helicopterDatabase } from "../unit/helicopterdatabase";
import { groundUnitDatabase } from "../unit/groundunitdatabase";
import { Buffer } from "buffer";
import { ROEs, emissionsCountermeasures, reactionsToThreat, states } from "../constants/constants";
import { Dropdown } from "../controls/dropdown";
import { UnitBlueprint } from "../@types/unitdatabase";

export function bearing(lat1: number, lon1: number, lat2: number, lon2: number) {
    const φ1 = deg2rad(lat1); // φ, λ in radians
    const φ2 = deg2rad(lat2);
    const λ1 = deg2rad(lon1); // φ, λ in radians
    const λ2 = deg2rad(lon2);
    const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
    const θ = Math.atan2(y, x);
    const brng = (rad2deg(θ) + 360) % 360; // in degrees

    return brng;
}

export function distance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = deg2rad(lat1); // φ, λ in radians
    const φ2 = deg2rad(lat2);
    const Δφ = deg2rad(lat2 - lat1);
    const Δλ = deg2rad(lon2 - lon1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c; // in metres

    return d;
}

export function bearingAndDistanceToLatLng(lat: number, lon: number, brng: number, dist: number) {
    const R = 6371e3; // metres
    const φ1 = deg2rad(lat); // φ, λ in radians
    const λ1 = deg2rad(lon);
    const φ2 = Math.asin( Math.sin(φ1)*Math.cos(dist/R) + Math.cos(φ1)*Math.sin(dist/R)*Math.cos(brng) );
    const λ2 = λ1 + Math.atan2(Math.sin(brng)*Math.sin(dist/R)*Math.cos(φ1), Math.cos(dist/R)-Math.sin(φ1)*Math.sin(φ2));

    return new LatLng(rad2deg(φ2), rad2deg(λ2));
}

export function ConvertDDToDMS(D: number, lng: boolean) {
    var dir = D < 0 ? (lng ? "W" : "S") : lng ? "E" : "N";
    var deg = 0 | (D < 0 ? (D = -D) : D);
    var min = 0 | (((D += 1e-9) % 1) * 60);
    var sec = (0 | (((D * 60) % 1) * 6000)) / 100;
    var dec = Math.round((sec - Math.floor(sec)) * 100);
    var sec = Math.floor(sec);
    if (lng)
        return dir + zeroPad(deg, 3) + "°" + zeroPad(min, 2) + "'" + zeroPad(sec, 2) + "." + zeroPad(dec, 2) + "\"";
    else
        return dir + zeroPad(deg, 2) + "°" + zeroPad(min, 2) + "'" + zeroPad(sec, 2) + "." + zeroPad(dec, 2) + "\"";
}

export function dataPointMap( container:HTMLElement, data:any) {
    Object.keys( data ).forEach( ( key ) => {
        const val = "" + data[ key ];  //  Ensure a string
        container.querySelectorAll( `[data-point="${key}"]`).forEach( el => {
            //  We could probably have options here
            if ( el instanceof HTMLInputElement ) {
                el.value = val;
            } else if ( el instanceof HTMLElement ) {
                el.innerText = val;
            }
        });
    });
}

export function deg2rad(deg: number) {
    var pi = Math.PI;
    return deg * (pi / 180);
}

export function rad2deg(rad: number) {
    var pi = Math.PI;
    return rad / (pi / 180);
}

export function generateUUIDv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function keyEventWasInInput( event:KeyboardEvent ) {
    const target = event.target;
    return ( target instanceof HTMLElement && ( [ "INPUT", "TEXTAREA" ].includes( target.nodeName ) ) );
}

export function reciprocalHeading(heading: number): number {
    return heading > 180? heading - 180: heading + 180;
}

export const zeroAppend = function (num: number, places: number, decimal: boolean = false) {
    var string = decimal? num.toFixed(2): String(num);
    while (string.length < places) {
        string = "0" + string;
    }
    return string;
}

export const zeroPad = function (num: number, places: number) {
    var string = String(num);
    while (string.length < places) {
        string += "0";
    }
    return string;
}

export function similarity(s1: string, s2: string) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / longerLength;
}

export function editDistance(s1: string, s2: string) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue),
                            costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

export function latLngToMercator(lat: number, lng: number): {x: number, y: number} {
    var rMajor = 6378137; //Equatorial Radius, WGS84
    var shift  = Math.PI * rMajor;
    var x      = lng * shift / 180;
    var y      = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
    y = y * shift / 180;
    
    return {x: x, y: y};
}

export function mercatorToLatLng(x: number, y: number) {
    var rMajor = 6378137; //Equatorial Radius, WGS84
    var shift  = Math.PI * rMajor;
    var lng    = x / shift * 180.0;
    var lat    = y / shift * 180.0;
    lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180.0)) - Math.PI / 2.0);

    return { lng: lng, lat: lat };            
}

export function createDivWithClass(className: string) {
    var el = document.createElement("div");
    el.classList.add(className);
    return el;
}

export function knotsToMs(knots: number) {
    return knots / 1.94384;
}

export function msToKnots(ms: number) {
    return ms * 1.94384;
}

export function ftToM(ft: number) {
    return ft * 0.3048;
}

export function mToFt(m: number) {
    return m / 0.3048;
}

export function mToNm(m: number) {
    return m * 0.000539957;
}

export function nmToFt(nm: number) {
    return nm * 6076.12;
}

export function polyContains(latlng: LatLng, polygon: Polygon) {
    var poly   = polygon.toGeoJSON();
    return turf.inside(turf.point([latlng.lng, latlng.lat]), poly);
}

export function randomPointInPoly(polygon: Polygon): LatLng {
    var bounds = polygon.getBounds(); 
    var x_min  = bounds.getEast();
    var x_max  = bounds.getWest();
    var y_min  = bounds.getSouth();
    var y_max  = bounds.getNorth();

    var lat = y_min + (Math.random() * (y_max - y_min));
    var lng = x_min + (Math.random() * (x_max - x_min));

    var poly   = polygon.toGeoJSON();
    var inside = turf.inside(turf.point([lng, lat]), poly);

    if (inside) {
        return new LatLng(lat, lng);
    } else {
        return randomPointInPoly(polygon);
    }
}

export function polygonArea(polygon: Polygon) {
    var poly = polygon.toGeoJSON();
    return turf.area(poly);
}

export function randomUnitBlueprint(unitDatabase: UnitDatabase, options: {type?: string, role?: string, ranges?: string[], eras?: string[]} ) {
    /* Start from all the unit blueprints in the database */
    var unitBlueprints = Object.values(unitDatabase.getBlueprints());

    /* If a specific type or role is provided, use only the blueprints of that type or role */
    if (options.type && options.role) {
        console.error("Can't create random unit if both type and role are provided. Either create by type or by role.")
        return null;
    }

    if (options.type) {
        unitBlueprints = unitDatabase.getByType(options.type);
    }
    else if (options.role) {
        unitBlueprints = unitDatabase.getByType(options.role);
    }

    /* Keep only the units that have a range included in the requested values */
    if (options.ranges) {
        unitBlueprints = unitBlueprints.filter((unitBlueprint: UnitBlueprint) => { 
            //@ts-ignore
            return unitBlueprint.range? options.ranges.includes(unitBlueprint.range): true;
        });
    }

    /* Keep only the units that have an era included in the requested values */
    if (options.eras) {
        unitBlueprints = unitBlueprints.filter((unitBlueprint: UnitBlueprint) => { 
            //@ts-ignore
            return unitBlueprint.era? options.eras.includes(unitBlueprint.era): true;
        });
    }

    var index = Math.floor(Math.random() * unitBlueprints.length);
    return unitBlueprints[index];
}

export function getMarkerCategoryByName(name: string) {
    if (aircraftDatabase.getByName(name) != null)
        return "aircraft";
    else if (helicopterDatabase.getByName(name) != null)
        return "helicopter";
    else if (groundUnitDatabase.getByName(name) != null){
        var type = groundUnitDatabase.getByName(name)?.type;
        if (type === "SAM")
            return "groundunit-sam";
        else if (type === "SAM Search radar" || type === "SAM Track radar" || type === "SAM Search/Track radar")
            return "groundunit-sam-radar";
        else if (type === "SAM Launcher")
            return "groundunit-sam-launcher";
        else if (type === "Radar")
            return "groundunit-ewr";
        else
            return "groundunit-other";
    }
    else 
        return "groundunit-other"; // TODO add other unit types  
}

export function getUnitDatabaseByCategory(category: string) {
    if (category == "aircraft")
        return aircraftDatabase;
    else if (category == "helicopter")
        return helicopterDatabase;
    else if (category.includes("groundunit"))
        return groundUnitDatabase;
    else
        return null;
}

export function base64ToBytes(base64: string) {
    return Buffer.from(base64, 'base64').buffer;
}

export function enumToState(state: number) {
    if (state < states.length) 
        return states[state];
    else 
        return states[0];
}

export function enumToROE(ROE: number) {
    if (ROE < ROEs.length) 
        return ROEs[ROE];
    else 
        return ROEs[0];
}

export function enumToReactionToThreat(reactionToThreat: number) {
    if (reactionToThreat < reactionsToThreat.length) 
        return reactionsToThreat[reactionToThreat];
    else 
        return reactionsToThreat[0];
}

export function enumToEmissioNCountermeasure(emissionCountermeasure: number) {
    if (emissionCountermeasure < emissionsCountermeasures.length) 
        return emissionsCountermeasures[emissionCountermeasure];
    else 
        return emissionsCountermeasures[0];
}

export function enumToCoalition(coalitionID: number) {
    switch (coalitionID){
        case 0: return "neutral";
        case 1: return "red";
        case 2: return "blue";
    }
    return "";
}

export function convertDateAndTimeToDate(dateAndTime: DateAndTime) {
    const date = dateAndTime.date;
    const time = dateAndTime.time;

    if (!date) {
        return new Date();
    }

    let year = date.Year;
    let month = date.Month - 1;

    if (month < 0) {
        month = 11;
        year--;
    }

    return new Date(year, month, date.Day, time.h, time.m, time.s);
}

export function createCheckboxOption(value: string, text: string, checked: boolean = true, callback: CallableFunction = (ev: any) => {}) {
    var div = document.createElement("div");
    div.classList.add("ol-checkbox");
    var label = document.createElement("label");
    label.title = text;
    var input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    var span = document.createElement("span");
    span.innerText = value;
    label.appendChild(input);
    label.appendChild(span);
    div.appendChild(label);
    input.onclick = (ev: any) => callback(ev);
    return div as HTMLElement;
}

export function getCheckboxOptions(dropdown: Dropdown) {
    var values: { [key: string]: boolean } = {};
    const element = dropdown.getOptionElements();
    for (let idx = 0; idx < element.length; idx++) {
        const option = element.item(idx) as HTMLElement;
        const key = option.querySelector("span")?.innerText;
        const value = option.querySelector("input")?.checked;
        if (key !== undefined && value !== undefined)
            values[key] = value;
    }
    return values;
}