(function() {
	var nsName = "LS"; // root namespace name

	// replacement function for console.log(), which avoids 'undefined' exception in IE 8
	window.LogMsg = function(msg) {
		if (window.console) {
			console.log(msg);
		}
	};

	var prototypeExtensions = function() {
		var stringExtensions = function() {
			// source: http://cwestblog.com/2011/07/25/javascript-string-prototype-replaceall/
			if (!String.prototype.replaceAll) {
				String.prototype.replaceAll = function(target, replacement) {
					return this.split(target).join(replacement);
				};
			}

			if (!String.prototype.format) {
			    String.prototype.format = function () {
			        var str = this.toString();
			        if (!arguments.length)
			            return str;

			        for (var i = 0; i < arguments.length; i++)
			            str = str.replaceAll("{" + i + "}", arguments[i]);
			        return str;
			    };
			}
		}(),
		dateExtensions = function() {
			var getFriendlyDate = (function () {
				var monthNames,
					dayNames,
					MakeArray = function (n) {
						this.length = n;
						return this;
					},
					getOrdinal = function (o) {
						return o + (['st', 'nd', 'rd'][(o + '').match(/1?\d\b/) - 1] || 'th');
					},
					formatFriendlyDate = function (date) {
						return [
							getOrdinal(date.getDate()),
							monthNames[date.getMonth() + 1],
							date.getFullYear()
						].join(' ');
					};

				monthNames = new MakeArray(12);
				monthNames[1] = "January";
				monthNames[2] = "February";
				monthNames[3] = "March";
				monthNames[4] = "April";
				monthNames[5] = "May";
				monthNames[6] = "June";
				monthNames[7] = "July";
				monthNames[8] = "August";
				monthNames[9] = "September";
				monthNames[10] = "October";
				monthNames[11] = "November";
				monthNames[12] = "December";

				dayNames = new MakeArray(7);
				dayNames[1] = "Sunday";
				dayNames[2] = "Monday";
				dayNames[3] = "Tuesday";
				dayNames[4] = "Wednesday";
				dayNames[5] = "Thursday";
				dayNames[6] = "Friday";
				dayNames[7] = "Saturday";

				return formatFriendlyDate;
			})();
		
			if (!Date.addYears) {
				Date.prototype.addYears = function(modifier) {
					return new Date(this.getFullYear() + modifier, this.getMonth(), this.getDate());
				};
			}

			if (!Date.addMonths) {
				Date.prototype.addMonths = function(modifier) {
					return new Date(this.getFullYear(), this.getMonth() + modifier, this.getDate());
				};
			}

			if (!Date.addDays) {
				Date.prototype.addDays = function(modifier) {
					return new Date(this.getFullYear(), this.getMonth(), this.getDate() + modifier);
				};
			}
			
			if (!Date.toFriendlyDate) {
		        Date.prototype.toFriendlyDate = function () {
		            return getFriendlyDate(this);
		        };
		    }

		    if (!Date.fromISO) {
		        Date.prototype.fromISO = function (isoDateString) {
		            var d = isoDateString.substr(0, 10).split('-'); // yyyy,MM,dd
		            this.setFullYear(d[0]);
		            this.setMonth(d[1]-1);
		            this.setDate(d[2]);
		            return this;
		        };
		    }
		}();
	}(),
	createRootNamespace = function() {
		return window[nsName] = {};
	},
	ns = createRootNamespace();

	ns.Utils = {
		// namespace creation function
		ensureNamespace: function(ns) {
			if (!ns.Utils.globalExists(ns)) {
				var nsArr = ns.split('.'); // split into array
				var obj = window; // start at window object
				for (var i = 0; i < nsArr.length; i++) {
					if (nsArr[i] == "window") // skip window if this is included in string
						continue;
					obj[nsArr[i]] = obj[nsArr[i]] || {}; // create an empty object
					obj = obj[nsArr[i]]; // get the new object and continue
				}
				LogMsg("Added namespace: " + ns);
			}
		},
		// check if a global variable exists
		globalExists: function(global) {
			return ns.Utils.getGlobal(global) != null;
		},
		// return a global from a string representation of its path
		getGlobal: function(globalString) {
			var globalArr = globalString.split('.'); // split into array
			var obj = window; // start at window object
			for (var i = 0; i < globalArr.length; i++) {
				if (globalArr[i] == "window") // skip window if this is included in string
					continue;
				if (!obj[globalArr[i]])
					return null; // the global namespace does not exist
				obj = obj[globalArr[i]]; // get the new object and continue
			}
			return obj; // the global namespace exists
		},
		// execute a callback when a global is present
		executeOnGlobal: function(global, func) {
			if (!ns.Utils.globalExists(global)) {
				setTimeout(function() {
					ns.Utils.executeOnGlobal(global, func);
				}, 100);
			} else {
				func();
			}
		},
		// add a script to the page
		addScript: function(url) {
			var script = document.createElement("script");
			script.setAttribute("src", url);
			var head = document.getElementsByTagName("head")[0];
			head.appendChild(script);
		},
		// check for a global variable, load a script if it doesn't exist and execute a callback once the global variable is present
		ensureLibrary: function(global, url, func) {
			if (!ns.Utils.globalExists(global))
				ns.Utils.addScript(url);

			if (func)
				ns.Utils.executeOnGlobal(global, func);
		},
		// adapted from http://stackoverflow.com/a/21152762
		getQueryString: (function() {
			var queryStrings = {},
				qs = window.location.search.substr(1).split("&");
			for (var i = 0; i < qs.length; i++) {
				var item = qs[i];
				queryStrings[item.split("=")[0]] = decodeURIComponent(item.split("=")[1]);
			}
			return function(key) {
				return queryStrings[key];
			};
		})(),
		// Source: SR http://code.msdn.microsoft.com/office/SharePoint-2013-Folder-661709eb
		replaceQueryStringAndGet: function(url, key, value) {
			var re = new RegExp("([?|&])" + key + "=.*?(&|$)", "i");
			var separator = url.indexOf('?') !== -1 ? "&" : "?";
			if (url.match(re)) {
				return url.replace(re, '$1' + key + "=" + value + '$2');
			} else {
				return url + separator + key + "=" + value;
			}
		},
		// helper for sorting arrays by property value (where getObjectProperty is a function that gets the object property that you would like to sort by)
		sortFunction: function(getObjectProperty, sortAscending) {
			return function(objA, objB) {
				var a = getObjectProperty(objA),
					b = getObjectProperty(objB);

				if (!sortAscending)
					var c = a,
						a = b,
						b = c; // swap a and b
				if (a < b)
					return -1;
				if (a > b)
					return 1;
				return 0;
			};
		},
		// if string 'str' contains a string in the array 'arr' return true, otherwise return false
		stringContainsArrayString: function(str, arr) {
			return (jQuery.grep(arr, function(value, index) {
				return str.indexOf(value) > -1;
			})).length > 0;
		},
		// return a copy of the array with duplicates removed
		arrayUnique: function(array) {
			var uniqueArray = [];
			jQuery.each(array, function(index, value) {
				if (jQuery.inArray(value, uniqueArray) === -1)
					uniqueArray.push(value);
			});
			return uniqueArray;
		},
		// AJAX error callback
		displayAJAXError: function(request, status, error) {
			LogMsg(["Error", error]);
		},
		displayError: function() {
			LogMsg(Array.prototype.slice.call(arguments));
		},
		// source: SO http://stackoverflow.com/a/2117523
		createGuid: function() {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				var r = Math.random() * 16 | 0,
					v = c == 'x' ? r : (r & 0x3 | 0x8);
				return v.toString(16);
			});
		},
		rateLimit: (function() {
			var dictionary = {};

			function unlock(key) {
				dictionary[key].timer = -1; /* allow execution of 'func' when 'rate' timeout has expired */
				if (dictionary[key].queued) { /* if requested during the cooldown, trigger the function when the cooldown has finished */
					dictionary[key].queued = false;
					execute(key);
				}
			}

			function execute(key) {
				var item = dictionary[key];
				item.timer = setTimeout(function() {
					unlock(key);
				}, item.rate);
				item.onExecute();
			}

			function executeOrQueue(key) {
				/* allow the function to be executed subsequent times at the rate specified */
				if (dictionary[key].timer == -1) {
					execute(key);
				} else {
					dictionary[key].queued = true;
				}
			}

			function addAndExecute(key, func, rate) {
				dictionary[key] = {
					onExecute: func,
					timer: -1,
					queued: false,
					rate: rate
				};
				execute(key); /* execute the function the first time and start the rate limit timer */
			}

			return function(key, func, rate) {
				if (!dictionary[key]) { /* add the key to the dictionary if it doesn't already exist */
					addAndExecute(key, func, rate);
				} else {
					executeOrQueue(key);
				}
			};
		})(),
		loadjQuery: function(callBack) {
			ns.Utils.ensureLibrary("jQuery", "//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js", callBack);
		}
	};
})();