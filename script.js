//All transactions
var txNodes = [];

var avgTxVal = 0;

//Getting information about the canvas via d3.select
var svg = d3.select("#canvas"),
  width = +svg.attr("width"),
  height = +svg.attr("height");

var centerX = width / 2.0;
var centerY = height / 2.0;
var totalNumTx = 0;
var timeElapsed = 0;
var txPerSec = 0;

var intervalID;


//Circles
var node = svg.append("g")
  .attr("class", "nodes")
  .selectAll("circle");

//Tooltip (This appears whenever a mouse hovers over a circle)
var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
     

//Setting up the physics of the simulation for the circles
    var circleSimulation = d3.forceSimulation(txNodes)
  .force("charge", d3.forceManyBody().strength(function(d,i){return -(d.scaledValue+50);}))
  .force("x", d3.forceX())
  .force("y", d3.forceY())
  .force("collision", d3.forceCollide(function radius(d,i){return d.scaledValue;}))
  .alphaTarget(1)
  .on("tick", circlesTicked);

                 
var websocket;

//Setting up and connecting to the blockchain.info websocket
function init() {          
  websocket = new WebSocket("wss://ws.blockchain.info/inv");

  //The connection status is controlled with the .onopen function
  //and the .onerror function
  websocket.onopen = function() { 
    document.getElementById("status").innerHTML ="Connected"; 
    };
    
  websocket.onerror = function(event) { 
    document.getElementById("status").innerHTML = "Error"; 
  };

  //When a message is recieved from blockchain.info
  //this means a new transaction has occurred
  //transaction info is gathered here
  websocket.onmessage = function(event) { 

    var msgData = JSON.parse(event.data);
    if (msgData.op == 'utx'){
      var txHash = msgData.x.hash;
      var outputs = msgData.x.out;
      var numberOfOuputs = msgData.x.vout_sz;
      var numberOfInputs = msgData.x.vin_sz;
      var totalTxValue = 0;  

 
      //Computing transaction total by summing the output values, could just have easily summed the inputs
      for(var j=0;j<outputs.length;j++){
            var output = outputs[j];
        totalTxValue += output.value;
        }
      totalTxValue /= 100000000;
      var newTx = {id:txHash, outputCount:numberOfOuputs, inputCount:numberOfInputs, value: totalTxValue, scaledValue: 5 + Math.log(totalTxValue) };
      txNodes.push(newTx);
      if (txNodes.length > 800)
      {
        txNodes.shift();
      }
      document.getElementById("txHash").innerHTML = "Latest Transaction: " + txHash; 

      ///calcluating average transaction value
      totalNumTx++;
      avgTxVal = (avgTxVal + totalTxValue)/totalNumTx;
      document.getElementById("avgTxVal").innerHTML = "Average Tx Value: " + avgTxVal;
      circlesRestart();

    }
  };                          
};
function calcTxPerSecond(){
  timeElapsed+=3;
  txPerSec = totalNumTx/timeElapsed;
  console.log('txPerSec: '+txPerSec);
  console.log('number of tx: '+totalNumTx);
  console.log('time elasped: '+timeElapsed)
  document.getElementById("txPerSec").innerHTML = 'Tx/Sec: '+txPerSec;
}

//Creating new circles
function circlesRestart() {
  var updateSelection = node.data(txNodes, function(d) { return d.id;}); //updated transactions
  updateSelection.exit().remove(); //removed transactions

  var enterSelection = updateSelection.enter()
    .append("circle")
    .attr("stroke","white")
    .attr("stroke-width","1")
    .attr("r", function(d) {return 3*d.scaledValue;})
    .attr("fill",function(d){return d3.hsl(180 + Math.min(d.value * 4,  180),1,0.3);}) //new transactions
    .on("mouseover", function(d) {   
      div.transition()        
        .duration(200)      
        .style("opacity", .9);      
      div.html('Transaction Hash: '+ d.id + "<br/>"  + 'Transaction Total Value: '+ d.value +  "</br>" + "Number of Inputs: " + d.inputCount + "</br>" + "Number Of Outputs: " +d.outputCount) 
        .style("left", (d3.event.pageX) + "px")     
        .style("top", (d3.event.pageY - 28) + "px");    
    })
    .on("mouseout", function(d) {       
      div.transition()        
          .duration(500)      
          .style("opacity", 0);   
    })
    .on("click", function(d) {
      stop();
      window.open("https://www.blockchain.com/btc/tx/"+d.id, "_blank");
    }); 
  
  node = updateSelection.merge(enterSelection);
  circleSimulation.nodes(txNodes);
  circleSimulation.alpha(1).restart();
}

//Acgually drawing the circle. It has had no dimensions before this point.
function circlesTicked() {
  node.attr("cx", function(d) { return d.x + centerX; })
    .attr("cy", function(d) { return d.y + centerY; });
 }

//Subscribing to unconfirmed transaction message from blockchain.info
function start() {
        
  //Setting interval of the calculation of transactions per second.
  //This is called every 3 seconds 
  intervalID = setInterval(calcTxPerSecond, 3000);
  document.getElementById("status").innerHTML = "Running"; 
  websocket.send('{"op":"unconfirmed_sub"}');
 
}

//Unsubscribing to unconfirmed transaction message from blockchain.info
function stop() {
  //clearInterval just stops the previously set calling of calcTxPerSecond every three seconds
  //when start is clicked, a new interval is created.
  clearInterval(intervalID);
  document.getElementById("status").innerHTML = "Stopped"; 
  websocket.send('{"op":"unconfirmed_unsub"}');

}
         
window.addEventListener("load", init, false);