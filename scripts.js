var elementsDisplay = [];
var upgradesDisplay = [];
var armyDisplay = [];

// var upgradesAvailable = 0;

var windowLoaded = false;
var clearAll = true; 

//Names: Gold Miner, TestWorker2, TestWorker3, TestWorker4
/*Upgrade Names:  
	GoldMiner: Reinforced Picks (Profit 1.5x)
	Lumberjacks: Reinforced Lumber Axes (Profit 1.5x)
	Stonecutter: Reinforced Chisels (Profit 1.5x)
	IronMiner: Reinforced Picks (Profit 1.5x) 
	Blacksmiths:	
	Chef: 							
*/

var resources  = ['Gold', 'Wood', 'Stone', 'Metal', 'Crop'];
var resourcesL = ['G', 'W', 'S', 'M', 'C'];
var setRate = [0, 0, 0, 0, 0];
var getRate = [0, 0, 0, 0, 0];
var resAmounts = [10000, 10000, 10000, 10000, 5000];
var armyStats = [0, 50, 0, 0, 0]; //Ranged Offense, Melee Offense, Ranged Defense, Melee Defense, Luck
//Luck is between 0-100, where 0 is the worst luck possible and 100 is very good luck
var updateRates = [0, 0, 0, 0, 0];
var clickAmount = [1, 1, 1, 1, 1];
var clickNum = [0, 0, 0, 0, 0];

var buyAmount = 1;

var land = 0;
var maxBuy = false;

var middleName = "";



// Cost scales: 5, 10, 15, 20

document.addEventListener("keydown", function keyBuyAmount(event) {
  console.log(event.which);

  	switch(event.which) {
  		case 16: {	//shift
	 	 	buyAmount = 10;
	  		max = false;
	  		break;
  		}	

  		case 18: {	//option
	  		buyAmount = 100;
	  		max = false;
	  		break;
		}

  		case 91: { //command
	  		max = true;
	  		break;
 		}

  		default: {
		  	buyAmount = 1;
		  	max = false;
		}
	}

  update();
});

document.addEventListener("keyup", function resetBuyAmount() {
  buyAmount = 1;
  max = false;

  update();
});

function subtractPrice(cost) {
	let canBuy = true;
	let missing = " ";
	for(let i=0; i < cost.length; i++) {
		if(resAmounts[i] < cost[i]) {
			canBuy = false;
			missing = missing + resources[i] + ", ";
		}
	}
	if(canBuy) {
		for(let i = 0; i < cost.length; i++) {
			resAmounts[i] -= cost[i];
		}
	} else {
		missing = missing.substring(0, missing.length - 2);
		alert("You do not have enough" + missing);
	}
	return(canBuy);
}

class Enemy  {
	constructor() {
		this.stats = [];
		this.level = this.level;
		this.name = this.name;
		this.nameSuffixes = ["Fleet", "Squadron", "Party", "Divsision"]
		this.postSuffix = this.nameSuffixes[this.difficulty];
		this.origin = this.origin; //Daz, whatever the name of that other group on
		this.generateStats();
	} 

	generateStats() {
		let scale = land/10;

		for(let i = 0; i < 4; i++)
		{
			this.stats[i] = scale * Math.random(0.9, 1.1);
		}

		this.stats[5] = 100 - armyStats[5];
	}

	generateName() {
		this.name = this.originate + this.postSuffix;
	}

	getStats() {return this.stats};
}

var enemy = new Enemy();

class Unit {
	constructor(name, desc, goldC, woodC, stoneC, metalC, cropC) {
		this.name = name;
		this.desc = desc;
		this.cost = this.initialCost = [goldC, woodC, stoneC, metalC, cropC];
		this.sellCost = [goldC/2, woodC/2, stoneC/2, metalC/2, cropC/2];
		this.initialCost = [goldC, woodC, stoneC, metalC, cropC];
		this.quantity = 0;
		this.costScale = 1.05;
	}

	buy() {
		if(subtractPrice(this.cost)) {
			this.quantity+=buyAmount;
			update();
			this.sendData();
			workerUpdate();
			armyUpdate();
		}
	}

	sell() {
		if(this.quantity >= buyAmount) {
			this.quantity -= buyAmount;
			for(let i = 0; i < this.cost.length;i++) {
				resAmounts[i]+=Math.floor(this.cost[i]/2);
			}
			update();
			this.sendData();
			workerUpdate();
			armyUpdate();
		}
	}

	sendData() {
		var eName = document.getElementsByClassName(this.getName()+'Name');
		var eQuantity = document.getElementsByClassName(this.getName()+'Quantity');
		var c = [];

		for (let i = 0; i < this.cost.length; i++) {
			this.cost[i] = Math.round(this.initialCost[i] * Math.pow(this.costScale, this.quantity));
			c[i] = this.initialCost[i] * Math.pow(this.costScale, this.quantity);

			if(buyAmount >= 1)
			{
				for(let j = 0; j < buyAmount-1; j++)
				{
					this.cost[i] += c[i] * Math.pow(this.costScale, j);
				}

				this.sellCost[i] = this.cost[i]/2;
				this.cost[i] = Math.round(this.cost[i]);
				this.sellCost[i] = Math.round(this.sellCost[i]);
			}
		}
	}

	getDCost() {
		let dCost = "";

		for(let i = 0; i < resourcesL.length; i++) {
			if(this.cost[i] !== 0) {
				dCost += this.cost[i] + " " + resourcesL[i] + ", ";
			}
		}
		
		dCost = dCost.substring(0, dCost.length - 2)

		return dCost;
	}

	getDSell()
	{
		let dCost = "";

		for(let i = 0; i < resourcesL.length; i++) {
			if(this.sellCost[i] !== 0) {
				dCost += this.sellCost[i] + " " + resourcesL[i] + ", ";
			}
		}

		dCost = dCost.substring(0, dCost.length - 2) //Removes last 2 chars, which should always be , followed by a space.


		return dCost;
	}

	getCost() {return this.cost;}
	getSell() {return this.sellCost;}
	getDesc() {return this.desc;}
	getQuantity() {return this.quantity;}
	getFullName() {return this.name;}
	getName() {return this.name.replace(/\s/g, '');}
}

class Elem extends Unit {
	constructor(name, desc, goldC, woodC, stoneC, metalC, cropC, goldP, woodP,  stoneP, metalP, cropP) {
		super(name, desc, goldC, woodC, stoneC, metalC, cropC);

		this.produce  = [goldP, woodP, stoneP, metalP, cropP];
	}
}

class ArmyUnit extends Unit {
	constructor(name, desc, goldC, woodC, stoneC, metalC, cropC, power, type) {
		super(name, desc, goldC, woodC, stoneC, metalC, cropC);

		this.power = power;
		this.type = type;
	}
}

class Unlock {
	constructor(name, desc, subDesc, ref, trigger) { //Name, Description (splash), Sub Desc (informative), Reference (Affected Elemented), Trigger (Trigger Point), Unlocked (Bool)
		this.name = name;
		this.desc = desc;
		this.subDesc = subDesc;
		this.ref = ref;
		this.trigger = trigger;
		this.unlocked = false;
	}

	isUnlocked() {return this.name;}
	getFullName() {return this.name;}
	getName() {return this.name.replace(/\s/g, '');}
	getDesc() {return this.desc;}
	getSubDesc() {return this.subDesc}
}

class Upgrade extends Unlock {
	constructor(name, desc, subDesc, goldC, ref, trigger, scale) {  //Scales
		super(name, desc, subDesc, ref, trigger); //Same

		this.goldC = goldC;
		this.unlocked = false;

		this.scale = scale;
	}

	buy() {
		if(this.getCost() <= resAmounts[0]) {
			this.unlocked = true;
 			resAmounts[0] -= this.goldC;
 			update();
		} else alert("You do not have enough gold to purchase this upgrade");
	}
	
	getID() {return this.id;}
	getCost() {return this.goldC;}
}

var elements = [
				new Elem('Farmer', 'temp', 10, 10, 10, 10, 10, 0, 0, 0, 0, 1),
				new Elem('Gold Miner', 'temp', 10, 0, 0, 0, 0, 1, 0, 0, 0, -0.2),
				new Elem('Lumberjack', 'temp',  10, 10, 0, 0, 0, 0, 1, 0, 0, -0.2), 
				new Elem('Stonecutter', 'temp',  10, 0, 10, 0, 0, 0, 0, 1, 0, -0.2), 
				new Elem('Iron Miner', 'temp', 10, 0, 0, 0, 10, 0, 0, 0, 1, -0.2),
				// new Elem('Blacksmith', 'temp')
				//new Elem('Buffboi')
				
				/*Proposed Elems:
					"Specialtized Workers (?)"
						Chef - Produces Meals - Turn Crop Into Foodstuffs, Iron/Wood Into Utensils?
						Blacksmith  - Produces Weaponry/Armor - Turn Iron/Gold/Wood Into Weapons/Armor
						Gemstone Miner - Produces Gems - Gems...Magic? 
						Jeweler - Produces Jewelry - Can Be Sold for $$$ - Can Be Used...TBD
						Artist - Produces Artwork - Needs Brushes/Paint - Artwork Can Be Sold - Improves "Culture"?
						Breeder - Horses???
				*/

			   ];

var army 	 = [ //(name, desc, goldC, woodC, stoneC, metalC, cropC, power, type)
				 //Types: 0: Ranged Offense, 1: Melee Offense, 2: Ranged defense, 3: Melee Defense, 4: Priests/Luck
				new ArmyUnit('Archer', 'temp', 10, 10, 10, 10, 5, 1, 0),
				new ArmyUnit('Portable Cannon', 'temp', 50, 50, 50, 50, 25, 5, 0),

				new ArmyUnit('Foot Soldier', 'temp', 10, 10, 10, 10, 5, 1, 1),
				new ArmyUnit('Heavy Duty Soldiers', 'temp', 50, 50, 50, 50, 25, 3, 1),
				
				new ArmyUnit('Archer Tower', 'temp', 10, 10, 10, 10, 5, 1, 2),
				new ArmyUnit('Heavy Duty Cannon', 'temp', 50, 50, 50, 50, 25, 3, 2),

				new ArmyUnit('Barracks', 'temp', 10, 10, 10, 10, 5, 1, 3),
				new ArmyUnit('Strong Walls', 'temp', 50, 50, 50, 50, 25, 3, 3),

				new ArmyUnit('Priest', 'Blessed are the children of God', 10, 10, 10, 10, 5, 5, 4),
				new ArmyUnit('Church', "church lmao", 50, 50, 50, 50, 25, 10, 4)
			   ];
				
let elemUpgrades = [
				//Farmers
				new Upgrade('Holy Hoes', "Our farmers, who art in heaven...hallowed be thy tools...", "Farmers are 2x as efficient!", 100, 0, 5, [1, 1, 1, 1, 2]),
				new Upgrade('Holier Hoes', "Thy harvst come, thy will be done...", "Farmers are 2x as efficient!", 500, 0, 25, [1, 1, 1, 1, 2]),
				new Upgrade('Even Holier Hoes', "Give us this day our daily crop...", "Farmers are 2x as efficient!", 5000, 0, 100, [1, 1, 1, 1, 2]),
				new Upgrade('Holiest Hoes', "And forgive us our GMOs...", "Farmers are 2x as efficient!", 25000, 0, 250, [1, 1, 1, 1, 2]),
				//Gold Miners
				new Upgrade('Reinforced Picks', "Your picks feel sturdier than ever!", "Gold Miners are 2x as efficient!", 100, 1, 5, [2, 1, 1, 1, 1]),  //Price, Ref, Trigger, Multiplier
				new Upgrade('Super Reinforced Picks', "Your picks feel super sturdy!", "Gold Miners are 2x as efficient!", 500, 1, 25, [2, 1, 1, 1, 1]),
				new Upgrade('Incredibly Reinforced Picks', "Your picks feel...incredibly sturdy!", "Gold Miners are 2x as efficient!", 5000, 1, 100, [2, 1, 1, 1, 1]),
				new Upgrade('Unfathomably Reinforced Picks', "The might of your picks is indescribable...", "Gold Miners are 2x as efficient!", 25000, 1, 250, [2, 1, 1, 1, 1]),

				//Lumberjacks
				new Upgrade('Sharpened Lumber Axes', "Your axes feel sharper than ever!", "Lumberjacks are 2x as efficient!", 100, 2, 5, [1, 2, 1, 1, 1]), 
				new Upgrade('Super Sharp Lumber Axes', "Your axes feel super sharp!", "Lumberjacks are 2x as efficient!", 500, 2, 25, [1, 2, 1, 1, 1]),
				new Upgrade('Incredibly Sharp Lumber Axes', "Your axes feel...incredibly sharp!", "Lumberjacks are 2x as efficient!", 5000, 2, 100, [1, 2, 1, 1, 1]),
				new Upgrade('Unfathomably Sharp Lumber Axes', "The blades of your axes glint with indescribable menace...", "Lumberjacks are 2x as efficient!", 25000, 2, 250, [1, 2, 1, 1, 1]),
				new Upgrade('Fast Jacking', "Your lumberjacks sure get the job done quick!", "Lumberjacks are 2x as efficient!", 100000, 2, 500, [1, 2, 1, 1, 1]),
				new Upgrade('Super Fast Jacking', "Your lumberjacks are really adept at...gathering wood!", "Lumberjacks are 2x as efficient!", 1000000, 2, 1000, [1, 2, 1, 1, 1]),
				new Upgrade('Insanely Fast Jacking', "You've never seen a lumberjack this effective!", "Lumberjacks are 2x as effecient!", 50000000, 2, 1250, [1, 2, 1, 1, 1]),
				new Upgrade('Master of Jacking', "You're a master of your craft", "Lumberjacks are 2x as effecient!", 250000000, 2, 1500, [1, 2, 1, 1, 1]),

				//Stone Cutters
				new Upgrade('Chiseled Chisels', "Your chisels...have abs now?", "Stonecutters are 2x as efficient!", 100, 3, 5, [1, 1, 2, 1, 1]),
				new Upgrade('Crazy Chiseled Chisels', "Okay, the abs have abs too?", "Stonecutters are 2x as efficient!", 500, 3, 25, [1, 1, 2, 1, 1]),
				new Upgrade('Colossally Chiseled Chisels', "These chisels are giving the stonecutters body image issues...", "Stonecutters are 2x as efficient!", 5000, 3, 100, [1, 1, 2, 1, 1]),
				new Upgrade('Catastrophically Chiseled Chisels', "The FDA is investigating your chisels for performance-enhancing drug use...", "Stonecutters are 2x as efficient!", 25000, 3, 250, [1, 1, 2, 1, 1]),

				//Iron Miners
				new Upgrade('Reinforced Iron Picks', "Wait, didn't you already buy reinforced picks?", "Iron Miners are 2x as efficient!", 100, 4, 5, [1, 1, 1, 2, 1]),
				new Upgrade('Super Reinforced Iron Picks', "Seriously, I could've sworn you bought this already...", "Iron Miners are 2x as efficient!", 500, 4, 25, [1, 1, 1, 2, 1]),
				new Upgrade('Incredibly Reinforced Iron Picks', "Seriously, I could've sworn you bought this already...", "Iron Miners are 2x as efficient!", 5000, 4, 100, [1, 1, 1, 2, 1]),
				new Upgrade('Unfathomably Reinforced Iron Picks', "Deception is afoot...", "Iron Miners are 2x as efficient", 25000, 4, 250, [1, 1, 1, 2, 1])
				];

let armyUpgrades = [
				//Archer Upgrades
				new Upgrade('Heavy Crossbows', "These shots sure do pack a wallop!", "Archers are 2x as powerful", 100, 0, 5, 2), //name, desc, subDesc, goldC, ref, trigger, scale
				new Upgrade('Serrated Arrowheads', "Hopefully, your enemies are spared the pain of removing them...because they'll be dead.", "Archers are 2x as powerful", 500, 0, 25, 2),
				new Upgrade('Flaming Arrows', "Think Cheetos, except instead of burning your mouth, they burn your enemies alive.", "Archers are 2x as powerful", 5000, 0, 100, 2),
				new Upgrade('Aerodynamic Arrows', "Your scientists have come up with more arrow-y arrows", "Archers are 2x as powerful", 25000, 0, 100, 2),

				//Soldier Upgrades
				new Upgrade('Knowledge of the Blade', "When you were partying, I studied the blade...", "Soldiers are 2x as powerful", 100, 2, 5, 2), 
				new Upgrade('Cultivation of Inner Strength', "While others pursued vanity, I cultivated inner strength", "Soldiers are 2x as powerful", 500, 2, 25, 2),
				new Upgrade('Men At Arms', "Now that the world is on fire, you have the audacity to come to me for help?", "Soldiers are 2x as powerful", 5000, 2, 100, 2),
				new Upgrade('The Art of War', "If you know the enemy and know yourself, you need not fear the result of a hundred battles.", "Soldiers are 2x as powerful", 25000, 2, 250, 2),

				// Priest Upgrades
				new Upgrade('Romans 2:23', "For all have sinned and fall short of the glory of God.", "Priests are 2x as powerful", 100, 8, 5, 2),
				new Upgrade('John 14:6', "I am the way and the truth and the life. No one comes to the father except through me.", "Priests are 2x as powerful", 500, 8, 25, 2),
				new Upgrade('James 4:7', "Submit yourselves, then, to God. Resist the devil, and he will free you.", "Priests are 2x as powerful", 5000, 8, 100, 2),
				new Upgrade('Colossians 3:23', "Whatever you do, work at it with all your heart, as working for the Lord, not for men.", "Priests are 2x as powerful", 25000, 8, 500, 2)

 				];

let clickUpgrades = [
				
				// new Upgrade('Powerful Click', "boop", "bop", 1000, 0, ) //(name, desc, subDesc, goldC, ref, trigger) 

				];
					
var upgrades = [];
var upgradesCenter = elemUpgrades.length;
var armyUpgradesCenter = elemUpgrades.length + armyUpgrades.length;

var units = [];
var unitsCenter = elements.length;


for(let i=0; i<elemUpgrades.length+armyUpgrades.length; i++) {
	if(i<elemUpgrades.length) {
		upgrades[i]=elemUpgrades[i];
	} else upgrades[i]=armyUpgrades[i-elemUpgrades.length];
}

var unlocks =  [new Unlock('Knows Picking', "You can really get all up in those...rocks...", "Purchased a Gold Miner", 0, 1),
				new Unlock('Getting Wood', "You know your way around a trunk! A tree trunk, that is...", "Purchased a Lumberjack", 1, 1),
				new Unlock('Rock Hard', "...", "Purchased a Stonecutter", 2, 1),
				new Unlock('Ironed Out', "Get those kinks settled once and for all!", "Purchased an Iron Miner", 3, 1),
				new Unlock('Hoes Only', "You're one with the land", "Purchased a Farmer", 4, 1)];


for(let i = 0; i < elements.length; i++) {
	elementsDisplay[i] = document.getElementById('e'+(i));
}

for(let i=0; i < army.length; i++) {
	armyDisplay[i] = document.getElementById('a'+(i))
}

function update() {
	workerUpdate();
	setCaches();
	showElements();

	for(let i = 0; i < elements.length; i++) {
		elements[i].sendData();

		for(let k = 0; k < document.getElementsByClassName("element"+i+"Quantity").length; k++) {
			document.getElementsByClassName("element"+i+"Quantity")[k].innerHTML = elements[i].getQuantity();
		}

		document.getElementById("element"+i+"Buy").innerHTML = elements[i].getDCost();
		document.getElementById("element"+i+"Sell").innerHTML = elements[i].getDSell();

	}

	for(let i = 0; i < army.length; i++) {
		army[i].sendData();

		for(let k = 0; k < document.getElementsByClassName("army"+i+"Quantity").length; k++) {
			document.getElementsByClassName("army"+i+"Quantity")[k].innerHTML = army[i].getQuantity();
		}

		document.getElementById("army"+i+"Buy").innerHTML = army[i].getDCost();
		document.getElementById("army"+i+"Sell").innerHTML = army[i].getDSell();
	}

	var repNames = [resources[0] + ": " + resAmounts[0], 
					resources[1] + ": " + resAmounts[1],
					resources[2] + ": " + resAmounts[2],
					resources[3] + ": " + resAmounts[3],
					resources[4] + ": " + resAmounts[4]];

	var materialRep = [document.getElementsByClassName('gold'), 
						document.getElementsByClassName('wood'), 
						document.getElementsByClassName('stone'), 
						document.getElementsByClassName('metal'), 
						document.getElementsByClassName('crop')];

	for(let i = 0; i < materialRep.length; i++) {
		for(let j = 0; j < materialRep[i].length; j++) {
			materialRep[i][j].innerHTML = repNames[i];
		}
	}
}	

function workerUpdate() {
	for(let i=0; i<updateRates.length; i++) {
		getRate[i] = 0;
		for(let j=0; j<elements.length; j++) {
			if(elements[j].produce[i] !== 0) {
				let canAdd = true;
				for(let k=0; k<elements[j].produce.length; k++) {
					if(elements[j].produce[k]<0 && resAmounts[k] <= 0) {
						canAdd=false;
					}
				}
				if(canAdd) {
					let mult=1;
					for(let l=0; l<upgradesCenter; l++) {
						if(upgrades[l].ref==j&&upgrades[l].unlocked) {
							mult*=upgrades[l].scale[i];
						}
					} 
					getRate[i]+=elements[j].produce[i]*elements[j].getQuantity()*mult;
				}
			}
		}
	}

	for(let i=0; i<updateRates.length; i++) {
		if(getRate[i]!== setRate[i]) {
			setRate[i] = getRate[i];
			clearInterval(updateRates[i]);
			updateRates[i] = setInterval(function(){resourcesUpdate(i);}, 1000/Math.abs(getRate[i]));
		}
	}

	for(let i=0; i< getRate.length; i++) {
		document.getElementById('rate'+i).innerHTML = Math.round(getRate[i]*100)/100;
	}
}

function resourcesUpdate(i) {
	if(getRate[i]!== 0){
		if(getRate[i] > 0) {
			resAmounts[i]++;
		} else resAmounts[i]--;
		update();
	}
}

function armyUpdate() {
	for(let i=0; i<armyStats; i++) {
		armyStats[i]=0;
		for(let j=0; j<armyStats; j++) {
			if(army[j].type==j) {
				let mult=1;
				for(let k=upgradesCenter; k<upgrades.length; k++) {
					if(upgrades[k].ref==j&&upgrades[k].unlocked) {
					mult*=upgrades[k].scale;
					}
				}
				armyStats[i]+=army[j].power*mult;
			}
		}
	}
}

function showElements() {
	for(let i = 0; i < elements.length - 1; i++) {
		if(elements[i].getQuantity() >= 5) {
			elementsDisplay[i+1].style.display = 'table-row';
		}
	}

	for(let i = 0; i < army.length - 1; i++) {
		if(army[i].getQuantity() >= 5) {
			armyDisplay[i+1].style.display = 'table-row';
		}
	}

	for(let i = 0; i < upgrades.length; i++) {
		if(upgradesDisplay[i]!==null){
			if(upgrades[i].unlocked == true) {
				upgradesDisplay[i].style.display = 'none';
			} else if(i < upgradesCenter) {
				if(elements[upgrades[i].ref].getQuantity() >= upgrades[i].trigger) {
					upgradesDisplay[i].style.display="table-row";
				}
			} else if(army[upgrades[i].ref].getQuantity() >= upgrades[i].trigger) {
				upgradesDisplay[i].style.display="table-row";
			}
		}
	}
}

function setCaches() {
	let elemQuan = [];
	let armyQuan = []; 
	let unlockedUpgrades = [];

	if(clearAll) {
		localStorage.removeItem("army");
		localStorage.removeItem("elements");
		localStorage.removeItem("resources");
		localStorage.removeItem("upgrades");
	}

	if(!windowLoaded) {
		for(let i = 0; i < army.length; i++) {
			armyQuan[i] = army[i].getQuantity();
		}

		for(let i = 0; i < elements.length; i++) {
			elemQuan[i] = elements[i].getQuantity();
		}

		for(let i=0; i < upgrades.length; i++) {
			unlockedUpgrades[i] = Number(upgrades[i].unlocked);
		}

		localStorage.army = JSON.stringify(armyQuan);
		localStorage.elements = JSON.stringify(elemQuan);
		localStorage.resources = JSON.stringify(resAmounts);
		localStorage.upgrades = JSON.stringify(unlockedUpgrades);
	}

	if(windowLoaded) {
		if(!localStorage.getItem("elements")) {
			localStorage.setItem("elements", JSON.stringify(elemQuan));
		} else {
			parsedElemQuan = JSON.parse(localStorage.getItem("elements"));
			for(let i = 0; i < parsedElemQuan.length; i++) {
				elements[i].quantity = parsedElemQuan[i];
			}
		}

		if(!localStorage.getItem("army")) {
			localStorage.setItem("army", JSON.stringify(armyQuan));
		} else {
			parsedArmyQuan = JSON.parse(localStorage.getItem("army"));
			for(let i = 0; i < parsedArmyQuan.length; i++) {
				army[i].quantity = parsedArmyQuan[i];
			}
		}

		if(!localStorage.getItem("resources")) {
			localStorage.setItem("resources", JSON.stringify(resAmounts));
		} else {
			resAmounts = JSON.parse(localStorage.getItem("resources"));
		}

		if(!localStorage.getItem("upgrades")) {
			localStorage.setItem("upgrades", JSON.stringify(unlockedUpgrades))
		} else {
			parsedUnlockedUpgrades = JSON.parse(localStorage.getItem("upgrades"))
			for(let i = 0; i < parsedUnlockedUpgrades.length; i++) {
				upgrades[i].unlocked = parsedUnlockedUpgrades[i]; 
			}

			console.log(parsedUnlockedUpgrades);
		}

		windowLoaded = !windowLoaded;
	}
}

function openTab(thisClass, thisID, targetClass, targetID) {
	var tabContent = document.getElementsByClassName(targetClass);

	for(let i = 0; i < tabContent.length; i++) {
		tabContent[i].style.display = "none";
		document.getElementsByClassName(thisClass)[i].className = thisClass;
	}

	document.getElementById(targetID).style.display = "block";
	document.getElementById(thisID).className = thisClass + " active";
}

function createUnits() {
	/*This isn't working properly. I assume something to do with lack of pointers, as I'm creating a clone vs actually referencing the objects?
	  Leaving commented until this is fixed. For now, reverting to 2x For Loops for functionality.*/

	let tables = [document.getElementById("elements_table"), document.getElementById("army_table")];
	let refer = [elements, army];
	let display = [elementsDisplay, armyDisplay];
	let letter = ["e", "a"];
	let type = ["element", "army"];

	for(let t = 0; t < tables.length; t++) {
		for(let i = 0; i < refer[t].length; i++) {
			let firstRow = tables[t].getElementsByTagName("tbody")[0];
			let newRow = tables[t].insertRow(tables[t].rows.length);
			for(let j = 0; j < 4; j++) {
				let newCells = newRow.insertCell(j);
			}

			newRow.setAttribute("class", type[t] + "_row");
			newRow.setAttribute("id", letter[t] + i);

			newRow.getElementsByTagName("td")[0].setAttribute("class", type[t]+i);
			newRow.getElementsByTagName("td")[0].setAttribute("title", refer[t][i].getDesc())
			newRow.getElementsByTagName("td")[1].setAttribute("class", type[t]+i+"Quantity");
			newRow.getElementsByTagName("td")[2].innerHTML = "<a class='buy' id='"+type[t]+i+"Buy' href='javascript:void(0);'></a>";
			newRow.getElementsByTagName("td")[3].innerHTML = "<a class='sell' id='"+type[t]+i+"Sell' href='javascript:void(0);'></a>";
			

			display[t][i] = document.getElementById(letter[t]+i);

			for(let k = 0; k < document.getElementsByClassName(type[t]+i).length; k++) {
				document.getElementsByClassName(type[t]+i)[k].innerHTML = refer[t][i].getFullName();
			}

			for(let l = 0; l < document.getElementsByClassName(type[t]+i+"Quantity").length; l++) {
				document.getElementsByClassName(type[t]+i+"Quantity")[l].innerHTML = refer[t][i].getQuantity();
			}

			document.getElementById(type[t]+i+"Buy").innerHTML = refer[t][i].getCost();
			document.getElementById(type[t]+i+"Sell").innerHTML = refer[t][i].getSell();

			document.getElementById(type[t]+i+"Buy").addEventListener('click', function() {
				refer[t][i].buy();
			});

			document.getElementById(type[t]+i+"Sell").addEventListener('click', function() {
				refer[t][i].sell();
			});
		}
	}
}


function createUpgrades() {
	let tableRef = document.getElementById("upgrades_table");

	for(let i = 0; i < upgrades.length; i++) {
		let firstRow = tableRef.getElementsByTagName("tbody")[0];
		let newRow = tableRef.insertRow(tableRef.rows.length);
		for(let j = 0; j < 4; j++) {
			let newCells = newRow.insertCell(j);	
		}


		newRow.setAttribute("class", "upgrade_row");
		newRow.setAttribute("id", "u"+i);

		newRow.getElementsByTagName("td")[0].setAttribute("class", "upgrade"+i);
		newRow.getElementsByTagName("td")[1].setAttribute("class", "upgrade"+i+"SubDesc");
		newRow.getElementsByTagName("td")[2].setAttribute("class", "upgrade"+i+"Desc");
		newRow.getElementsByTagName("td")[3].innerHTML = "<a class='buy' id='upgrade"+i+"Buy' href='javascript:void(0);'></a>";

		upgradesDisplay[i] = document.getElementById('u'+i);



		for(let j = 0; j < document.getElementsByClassName("upgrade"+i).length; j++) {
			document.getElementsByClassName("upgrade"+i)[j].innerHTML = upgrades[i].getFullName();
		}


		for(let k = 0; k < document.getElementsByClassName("upgrade"+i+"SubDesc").length; k++) {
			document.getElementsByClassName("upgrade"+i+"SubDesc")[k].innerHTML = upgrades[i].getSubDesc();
		}

		for(let l = 0; l < document.getElementsByClassName("upgrade"+i+"Desc").length; l++) {
			document.getElementsByClassName("upgrade"+i+"Desc")[l].innerHTML = upgrades[i].getDesc();
		}

		document.getElementById("upgrade"+i+"Buy").innerHTML = upgrades[i].getCost();

		if(document.getElementById("upgrade"+i+"Buy") != null)	{
			document.getElementById("upgrade"+i+"Buy").addEventListener('click', function() {
				upgrades[i].buy(); 
			});
		}
	}

	for (let i = 0; i < resAmounts.length; i++) {
		document.getElementById('r'+i).addEventListener('click', function() {
			 addResource(i, clickAmount[i]);
			 clickNum[i]++;
		});
	}
}

function addResource(index, amount) {
	console.log(index);
	resAmounts[index] += amount;
	update();
}

function attackEnemy()
{
	let diff = [];
	let eStats = enemy.getStats();

	// for(let i = 0; i < armyStats.length-1; i++)
	// {
	// 	diff[i] = (armyStats[i] * armyStats[5]) - (enemy.getStats()[i] * enemy.getStats()[5]);
	// }

	diff[0] = armyStats[0] - eStats[2];
	diff[1] = armyStats[1] - eStats[3] + diff[0]*2;
}

/* Settings Nonsense */

window.onload = function() {
	windowLoaded = true;
	setCaches();
	createUpgrades();
	createUnits();
	update();
}