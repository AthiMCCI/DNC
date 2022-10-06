/*###############################################################################
// Module: DataDownload.js
// 
// Function:
//      Function to DataDownload  module
// 
// Version:
//    V1.02  Tue Dec 01 2021 10:30:00  Seenivasan   Edit level 2
// 
//  Copyright notice:
//       This file copyright (C) 2021 by
//       MCCI Corporation
//       3520 Krums Corners Road
//       Ithaca, NY 14850
//       An unpublished work. All rights reserved.
// 
//       This file is proprietary information, and may not be disclosed or
//       copied without the prior permission of MCCI Corporation.
// 
//  Author:
//       Seenivasan, MCCI July 2021
// 
//  Revision history:
//       1.01 Fri aug 19 2022 10:00:00 seenivasan
//       Module created.
//       1.02 mon 2022 05:00:00 Seenivasan
//       
###############################################################################*/


import { StylesContext } from '@material-ui/styles';
import React, {useRef, useState } from 'react';
import { CSVLink } from 'react-csv'
import {View, Text, Picker} from 'react-native'
import { Button } from 'react-native';
import Animated from 'react-native-reanimated';
import { DatePicker } from 'react-rainbow-components';
import ProgressBar from 'react-native-animated-progress';

var queries = []

var csvLink;

const BASE_URL = "https://www.cornellsaprun.com/dncgiplugin"


var clients = ["Sap-Flow", "Sap-Flow", "Sap-Flow", "Sap-Flow", "Collie-Soil", "Collie-Soil", "Sap-Flow", "Sap-Flow", "Sap-Flow", "Collie-Pressure" ]

const SAP_FLOW_OUTDOOR = "SELECT mean(\"propaneUsedCfPerHour\") *0.332 / 231 FROM \"SapFlowData\" WHERE \
                         (\"Location\" = 'selloc' AND \"Area\" = 'Outdoor') AND time >= fromstamp and time <= tostamp GROUP BY time(3h)"

const SAP_FLOW_PER_TAP = "SELECT mean(\"propaneUsedCfPerHour\") FROM \"SapFlowData\" WHERE \
                         (\"Location\" = 'selloc' AND \"Area\" = 'Indoor' AND \"Topic\" = 'Gallons/Tap') AND \
                         time >= fromstamp and time <= tostamp GROUP BY time(3h)"

const SAP_SWEETNESS = "SELECT \"propaneUsedCfHour\" FROM \"SapFlowData\" WHERE \
                      (\"Location\" = 'selloc' AND \"Area\" = 'Indoor' AND \"Topic\" = 'Sap Sweetness') AND \
                      time >= fromstamp and time <= tostamp GROUP BY time(3h)"

const SYRUP_PER_TAP = "SELECT non_negative_difference(mean(\"propaneUsedCF\")) FROM \"SapFlowData\" WHERE \
                       (\"Location\" = 'selloc' AND \"Area\" = 'Indoor' AND \"Topic\" = 'Syrup per Tap') AND \
                       time >= fromstamp and time <= tostamp GROUP BY time(3h)"

const SOIL_MOIST = "SELECT mean(\"soilHumidity\") FROM \"SoilSensorData\" WHERE \
                    (\"Location\" = 'selloc') AND time >= fromstamp and time <= tostamp GROUP BY time(3h)"

const SOIL_TEMP = "SELECT mean(\"soilTempC\") *1.8 + 32 FROM \"SoilSensorData\" WHERE \
                  (\"Location\" = 'selloc') AND time >= fromstamp and time <= tostamp GROUP BY time(3h)"

const REL_HUMI = "SELECT mean(\"rh\") FROM \"SapFlowData\" WHERE \
                 (\"Location\" = 'selloc' AND \"Area\" = 'Outdoor') AND time >= \
                 fromstamp and time <= tostamp GROUP BY time(3h)"

const ATMOS_PRESSURE = "SELECT mean(\"p\") FROM \"SapFlowData\" WHERE \
                        (\"Location\" = 'selloc' AND \"Area\" = 'Outdoor') AND time >= \
                        fromstamp and time <= tostamp GROUP BY time(3h)"

const ATMOS_TEMP = "SELECT mean(\"tempC\") *1.8+32 FROM \"SapFlowData\" WHERE \
                   (\"Location\" = 'selloc' AND \"Area\" = 'Outdoor') AND time >= \
                   fromstamp and time <= tostamp GROUP BY time(3h)"

const TREE_PRESSURE = "SELECT mean(\"p\") *1000*0.01450377 FROM \"SapPressureData\" WHERE \
                      (\"Location\" = 'selloc' AND \"Function\" = 'Tree') AND time >= \
                      fromstamp and time <= tostamp GROUP BY time(3h)"

const DATA_LOOP = [SAP_FLOW_OUTDOOR, SAP_FLOW_PER_TAP, SAP_SWEETNESS, SYRUP_PER_TAP, SOIL_MOIST, SOIL_TEMP,
                   REL_HUMI, ATMOS_PRESSURE, ATMOS_TEMP, TREE_PRESSURE]

const sdname = ["date", "time", "sfod", "sfpt", "sapswt", "syrpt", 
                "smoist", "stemp", "relhum", "atmoprs", "atmotemp", "treep"]

const csvheaders = [
    {label: "Date", key: "date"},
    {label: "Time", key: "time"},
    {label: "Sap Flow Outdoor", key: "sfod"},
    {label: "Tree Pressure", key: "treep"},
    {label: "Atmospheric Pressure", key: "atmoprs"},
    {label: "Atmospheric Temperature", key: "atmotemp"},
    {label: "Relative Humidity", key: "relhum"},
    {label: "Soil Moisture", key: "smoist"},
    {label: "Soil Temperature", key: "stemp"},
    {label: "Sap Flow Per Tap", key: "sfpt"},
    {label: "Sap Sweetness", key: "sapswt"},
    {label: "Syrup Per Tap", key: "syrpt"}
]



function getLocationData(username, password, iquery){
    return new Promise(async function(resolve, reject){
        var myHeaders = new Headers();
        myHeaders.append("Authorization", 'Basic ' + Buffer.from(username + ':' + password).toString('base64'));
        myHeaders.append("Content-Type", "application/json");
        var query = JSON.stringify({"q": iquery});

        var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: query
        };

        fetch(BASE_URL+"/query?db=cornell_sap_db", requestOptions)
        .then(response => response.json())
        .then(data => {
            resolve(data)
        })
        .catch(error => {
            reject(error)
        });
    })
}


function splitResponse(cnt, resp)
{
    let datetime = [],param = []
    let vname = sdname[cnt+2]
        
    if(resp.hasOwnProperty("results"))
    {
        if(resp.results[0].hasOwnProperty("series"))
        {
            let serlen = resp.results[0].series.length
            datetime.length = 0
            param.length = 0        
            for(let i=0; i<serlen; i++)
            {
                let sdata = resp.results[0].series[i].values
                for(let j=0; j<sdata.length; j++) 
                {
                    datetime.push(sdata[j][0])
                    param.push(sdata[j][1])
                }
            }
        }
    }
    else
    {
        console.log("No results in response")
    }

    let fdict = {}
    fdict["datetime"] = datetime
    fdict[vname] = param
    //console.log(fdict)
    return fdict
}


export default function App(props){
    csvLink = useRef()

    const [location, setLocation] = useState("Arnot");
    const [frmDate, setFrmDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());

    const [csvfname, setCsvFname] = useState("default.csv");
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [userData, setUserData] = useState([]);

    const [loading, setLoading] = useState(false);
    const [percentage, setPercentage] = useState(0);

    var devData = []

    function constructRequest()
    {
        console.log("Selected Location: ", location)
        console.log("From Date: ", Date.parse(frmDate))
        console.log("To Date: ", toDate)
    }


    function dateFormetter(indate)
    {
        let dt = indate.getDate() 
        dt = dt < 10 ? '0'+dt : dt;
        let mnth = indate.getMonth()+1;
        mnth = mnth < 10 ? '0'+mnth : mnth;
        let yr = indate.getFullYear()

        let cdate = dt+'-'+mnth+'-'+yr
        return cdate
    }

    function hourFormetter(indate)
    {
        let hr = indate.getHours();
        let mnt = indate.getMinutes();
        let sec = indate.getSeconds();

        hr = hr < 10 ? '0'+hr : hr;
        mnt = mnt < 10 ? '0'+mnt : mnt;
        sec = sec < 10 ? '0'+sec : sec;

        let ctime = hr+':'+mnt+':'+sec

        return ctime
    }


    function setCsvFileName()
    {
        let dformat = hourFormetter(new Date())

        let fdate = dateFormetter(frmDate)
        let tdate = dateFormetter(toDate)

        let nformat = `${location}_${fdate}_to_${tdate}_`
        let csvfname = ""+nformat+dformat+".csv"
        setCsvFname(csvfname);
    }


    function constructRequest(){
        queries.length = 0
        for(let i=0; i<DATA_LOOP.length; i++){
            let qstr = DATA_LOOP[i]
            let qstr1 = qstr.replace("selloc", location)
            let qstr2 = qstr1.replace("fromstamp", Date.parse(frmDate)+"ms")
            let qstr3 = qstr2.replace("tostamp", Date.parse(toDate)+"ms")
            queries.push(qstr3)
        }
    }
    
    async function onDownload()
    {
        devData.length = 0

        let multfact = 100 / queries.length;
       
        for(let i=0; i<queries.length; i++){
            setPercentage((i+1)*multfact)
            let resp = await getLocationData(clients[0], "admin", queries[0]);
            let fdict = {};
            fdict = splitResponse(i, resp)
            devData.push(fdict)
        }

        let fdevDate = []
        for(let i=0; i<devData.length; i++)
        {
            fdevDate = fdevDate.concat(devData[i]["datetime"])
        }
        fdevDate = [...new Set(fdevDate)]

        let finalArray = []
        
        let ddate = [], dtime = []
        for(let k=0; k<fdevDate.length; k++)
        {
            ddate.push(fdevDate[k].split("T")[0])
            dtime.push(fdevDate[k].split("T")[1].slice(0, 8))
        }

        finalArray.push({"date": ddate})
        finalArray.push({"time": dtime})

        for(let i=0; i<devData.length; i++)
        {
            let datearr = devData[i]["datetime"]
            let params = devData[i][sdname[i+2]]
            let nparams = []
            for(let j=0; j<fdevDate.length; j++)
            {
                let idx = datearr.indexOf(fdevDate[j])
                if(idx == -1)
                {
                    nparams[j] = undefined
                }
                else
                {
                    nparams[j] = params[idx]
                }
            }
            let ndict = {}
            ndict[sdname[i+2]] = nparams
            finalArray.push(ndict)
        }

        let ftsdata = []
        let hdrstr = {'header':'Hi this document is generated for Arnot Site and contains data from July 21 2022 to Aug 15 2022'}
        ftsdata.push(hdrstr)
        for(let i=0; i<fdevDate.length; i++)
        {
            let rowdict = {}
            for(let j=0; j<sdname.length; j++)
            {
                rowdict[sdname[j]] = finalArray[j][sdname[j]][i]
            }
            ftsdata.push(rowdict)
        }

        setUserData(ftsdata)
        

        const timer = setTimeout(() => 
        {
            csvLink.current.link.click()
        }, 1000);

        setLoading(false);
        
        return () => clearTimeout(timer);
    }

    const onHandleDnload = () =>
    {
        console.log(location, frmDate, toDate);
        constructRequest();
        setCsvFileName();
        setCsvHeaders(csvheaders);
        setPercentage(0);
        setLoading(true);
        onDownload();
    }

    const onHandleBack = () => 
    {    
        props.navigation.navigate('LoginScreen');
    }

    const onLocationChange = (e) => 
    {
        console.log("Location Change: ", e.target.value)
        setLocation( e.target.value)
    }


    return (
        <View style={{
            backgroundColor: "green",
            flex: 1,
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 30
             }}>
            <Text style ={{
                color: "white",
                fontSize: 30
            }}>
            Cornell Maple Data Download</Text>
            <View style = {{
                backgroundColor: "green",
                flex: 0.1,
                flexDirection: "row",
                marginTop: 60,
            }}>

                <Text style ={{
                    color: "white",
                    fontSize: 20,
                    paddingRight: 30
                }}>
                Select the Location</Text>
                <Picker style = {{
                    fontSize: 20,
                    paddingLeft: 10,
                    height: 30
                }} 
                onChange = {(e) => onLocationChange(e)}>

                    <Picker.Item label="Arnot" value="Arnot"></Picker.Item>
                    <Picker.Item label="Uihlein" value="Uihlein"></Picker.Item>
                    <Picker.Item label="UVM" value="UVM"></Picker.Item>
                </Picker>
                
            </View>
            
            <View style = {{
                backgroundColor: "green",
                flex: 0.1,
                flexDirection: "row"
            }}>
                <Text style ={{
                    color: "white",
                    fontSize: 20,
                    paddingTop: 5
                }}>
                From Date</Text>
                <DatePicker style={{paddingLeft: 20,  width: 200}} value={frmDate} onChange={value =>setFrmDate(value)}>
                    </DatePicker>

                    <Text style ={{
                    color: "white",
                    fontSize: 20,
                    paddingTop: 5,
                    paddingLeft: 30
                }}>
                To Date</Text>
                <DatePicker style={{paddingLeft: 20,  width: 200}} value={toDate} onChange={value =>setToDate(value)}>
                </DatePicker>
                
        </View>{ loading && 
            <View>
                <Text style ={{
                    color: "white",
                    fontSize: 20,
                    paddingTop: 10,
                    paddingBottom: 10
                    }}>
                    Data downloading, please wait ...
                </Text>
                <ProgressBar progress={percentage} height={7} backgroundColor="#fff" />
            </View>}
            
            { !loading &&
            <View style ={{
                backgroundColor: "green",
                flex: 0.1,
                marginTop: 30
                }}>
                    <Button style={{paddingTop: 10, backgroundColor: "yellow"}} title="Download" onPress = {onHandleDnload}/>
                    <CSVLink 
                    headers = {csvHeaders}
                    data = {userData}
                    filename= {csvfname}
                    className="hidden"
                    ref={csvLink}
                    target="_blank" />
            </View>}
            
            <View style = {{
                backgroundColor: "green",
                flex: 0.1,
                marginTop: 50
                }}>
                    <Button style={{paddingTop: 10, backgroundColor: "yellow"}}  title="Back" onPress = {onHandleBack}/>
            </View>
        </View>

    );
}