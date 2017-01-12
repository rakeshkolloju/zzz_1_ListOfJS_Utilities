(function() {
	var nsName = "LS"; // root namespace name
	var ns = window[nsName]; // root namespace alias
	var utils = ns.Utils; // utils alias
	ns.SP = ns.SP || {};
	
	ns.SP.REST = {
		Webs: {
			getWebs: function() {
				// URL exclusions (don't include the protocol or tenant sub-domain: i.e. "company365")
				var trimDuplicates = false,
					queryText = 'contentclass:"STS_Web" SPSiteUrl:' + _spPageContextInfo.siteAbsoluteUrl, // get webs for the site collection
					sites;
					
				LogMsg("Search query: " + queryText);
			
				var queryUrl = window.location.protocol + "//" + window.location.hostname + "/_api/search/query?querytext='" +
					queryText + "'&rowlimit=500&trimduplicates=" + trimDuplicates.toString() +
					"&selectproperties='Path,Title'"; // reduce the amount of data returned to required fields
			
				return jQuery.ajax({
					url: queryUrl,
					async: true,
					method: "GET",
					headers: {
						"Accept": "application/json; odata=verbose"
					}
				})
				.then(function (data) {
					var results = data.d.query.PrimaryQueryResult.RelevantResults.Table.Rows.results,
						sites = jQuery.map(results, function (result, resultIndex) {
							var web = {};
							jQuery.each(result.Cells.results, function(propIndex, prop) {
								web[prop.Key] = prop.Value;
							}); // map array dictionary to a simple object
							return web;
						});
					return sites;
				}, utils.displayAJAXError);
			}
		},
		Sites: {
			// get a list of private site collections
			getSites: function() {
				// Credit: http://social.msdn.microsoft.com/Forums/sharepoint/en-US/34441fc0-50c8-4db0-b539-05a9b9e28a3b/get-a-list-with-all-sharepoint-sites-with-javascript?forum=sharepointdevelopment
	
				// URL exclusions (don't include the protocol or tenant sub-domain: i.e. "company365")
				var urlExclusions = [".sharepoint.com/sites/contentTypeHub", "-public.sharepoint.com", "-my.sharepoint.com"],
					trimDuplicates = false,
					queryText = 'contentclass:"STS_Site"', // get site collections
					sites,
			
					// get SharePoint Online tenant sub-domain
					subDomain = window.location.hostname.split('.')[0].replace("-my", "").replace("-public", "");
			
				// add URL exclusions to query
				jQuery.each(urlExclusions, function (index, value) {
					queryText += ' -path:"' + window.location.protocol + '//' + subDomain + value + '"';
				});
			
				LogMsg("Search query: " + queryText);
			
				var queryUrl = window.location.protocol + "//" + window.location.hostname + "/_api/search/query?querytext='" + queryText + "'&rowlimit=500&trimduplicates=" + trimDuplicates.toString(); // 500 is max per page. Exclusions must be included in the query to get the desired results in the first page (or you could implement paging).
			
				return jQuery.ajax({
					url: queryUrl,
					async: true,
					method: "GET",
					headers: {
						"Accept": "application/json; odata=verbose"
					}
				})
				.then(function (data) {
					var results = data.d.query.PrimaryQueryResult.RelevantResults.Table.Rows.results,
						sites = jQuery.map(results, function (value, index) {
							return value.Cells.results[6].Value;
						});
					return utils.arrayUnique(sites); // prevent duplicates
				}, utils.displayAJAXError);
			},
			// get a list of personal site collections
			getMySites: function() {
				var trimDuplicates = false,	
	
					// get SharePoint Online tenant sub-domain
					subDomain = window.location.hostname.split('.')[0].replace("-my", "").replace("-public", ""),
					personalSitePath = "https://" + subDomain + "-my.sharepoint.com/personal",
					rowLimit = 500, // this is the max possible page size
			
					queryText = 'contentclass:"STS_Site" path:' + personalSitePath;
					allSites = []; // array to store sites while iterating over results pages
			    
			    function getSites(startRow) {
					if(!startRow)
						startRow = 0;
				
					var queryUrl = window.location.protocol + "//" + window.location.hostname + "/_api/search/query?querytext='" + queryText + "'&rowlimit=" + rowLimit + "&startrow=" + startRow + "&trimduplicates=" + trimDuplicates.toString();
				
					return jQuery.ajax({
						url: queryUrl,
						async: true,
						method: "GET",
						headers: {
							"Accept": "application/json; odata=verbose"
						}
					})
					.then(function (data) {            
						var totalRowCount = data.d.query.PrimaryQueryResult.RelevantResults.TotalRows,
							results = data.d.query.PrimaryQueryResult.RelevantResults.Table.Rows.results,
							sites = jQuery.map(results, function (value, index) {
								return value.Cells.results[6].Value;
							}),
							sites = utils.arrayUnique(sites); // prevent duplicates
							
						allSites = sites.concat(allSites); // add sites to allSites array
						// if there are more results ? get the next page : return the results
						return startRow + rowLimit < totalRowCount ? getSites(startRow + rowLimit) : allSites;
					}, utils.displayAJAXError);
				}
			    
				return getSites();
			}
		},
		Lists: {
			getItemType: function (url, listName) {
				return jQuery.ajax({
					url: url + "/_api/web/lists/getbytitle('" + listName + "')",
					type: "GET",
					dataType: 'json',
					beforeSend: function (xhr) {
						xhr.setRequestHeader("accept", "application/json; odata=verbose");
					}
				})
				.then(function (data) {
					LogMsg("ListItemEntityTypeFullName: " + data.d.ListItemEntityTypeFullName);
					return data.d.ListItemEntityTypeFullName;
				}, utils.displayAJAXError);
			},
			// http://www.plusconsulting.com/blog/2013/05/crud-on-list-items-using-rest-services-jquery/
			getItem: function (url, listName, id) {
				LogMsg("Getting item '" + id + "' from list '" + listName + "'");
				return jQuery.ajax({
					url: url + "/_api/web/lists/getbytitle('" + listName + "')/items(" + id + ")",
					method: "GET",
					headers: {
						"Accept": "application/json; odata=verbose"
					}
				});
			},
			getItems: function (url, listName) {
				return jQuery.ajax({
					url: url + "/_api/web/lists/getbytitle('" + listName + "')/items",
					type: 'GET',
					dataType: 'json',
					beforeSend: function (xhr) {
						xhr.setRequestHeader("accept", "application/json; odata=verbose");
					}
				})
				.then(function(data) {
					return data.d.results;
				});
			},
			getFields: function (url, listName, fieldInternalNames) {
				return jQuery.ajax({
					url: url + "/_api/web/lists/getbytitle('" + listName + "')/fields?$select=Title,InternalName,TypeAsString",
					type: 'GET',
					dataType: 'json',
					beforeSend: function (xhr) {
						xhr.setRequestHeader("accept", "application/json; odata=verbose");
					}
				})
				.then(function (data) {
					var array = data.d.results;
					if (fieldInternalNames) {
						array = jQuery.grep(array, function (value, index) {
							return jQuery.inArray(value.InternalName, fieldInternalNames) > -1;
						});
					}
					return array;
				});
			},
			addItem: function (url, listName, metadata) {
				return ns.SP.REST.Lists.getItemType(url, listName)
					.then(function (listItemType) {
						var data = jQuery.extend({
							'__metadata': {
								'type': listItemType
							}
						}, metadata);
						LogMsg("Adding list item");
						LogMsg(data);
				
						return jQuery.ajax({
							url: url + "/_api/web/lists/getbytitle('" + listName + "')/items",
							type: "POST",
							contentType: "application/json;odata=verbose",
							data: JSON.stringify(data),
							dataType: 'json',
							headers: {
								"Accept": "application/json;odata=verbose",
								"X-RequestDigest": ns.SP.REST.getRequestDigest()
							}
						});
					}, utils.displayAJAXError);
			},
			updateItem: function (url, listName, id, metadata) {
				return ns.SP.REST.Lists.getItemType(url, listName)
					.then(function (listItemType) {
						var data = jQuery.extend({
							'__metadata': {
								'type': listItemType
							}
						}, metadata);
						LogMsg("Updating list item " + id);
						LogMsg(data);
			
						return ns.SP.REST.Lists.getItem(url, listName, id)
							.then(function (item) {
								return jQuery.ajax({
									url: item.d.__metadata.uri,
									type: "POST",
									contentType: "application/json;odata=verbose",
									data: JSON.stringify(data),
									dataType: 'json',
									headers: {
										"Accept": "application/json;odata=verbose",
										"X-RequestDigest": ns.SP.REST.getRequestDigest(),
										"X-HTTP-Method": "MERGE",
										"If-Match": "*"
									}
								});
							})
							.then(function () {
								LogMsg("Item updated");
								return;
							}, utils.displayAJAXError);
					});
			},
			deleteItem: function (url, listName, id) {
				LogMsg("Deleting list item " + id);
				return ns.SP.REST.Lists.getItem(url, listName, id)
					.then(function (item) {
						return jQuery.ajax({
							url: item.d.__metadata.uri,
							type: "POST",
							headers: {
								"Accept": "application/json;odata=verbose",
								"X-Http-Method": "DELETE",
								"X-RequestDigest": ns.SP.REST.getRequestDigest(),
								"If-Match": "*"
							}
						});
					})
					.then(function () {
						LogMsg("Item deleted");
						return;
					}, utils.DisplayAJAXError);
			}
		},
		Permissions: {
			getSitePermissionLevels: function(url) {
				// get an array of SP.RoleDefinition objects representing the Permission Levels for the site
				return jQuery.ajax({
					url: url + "/_api/web/RoleDefinitions?$select=Name,Description,Id,BasePermissions",
					cache: false,
					async: true,
					dataType: "json",
					beforeSend: function (xhr) {
						xhr.setRequestHeader("accept", "application/json; odata=verbose");
					}
				})
				.then(function (data) {
					return data.d.results;
				});
			}
		},
		Users: {
			getGroupMembers: function (url, groupTitle) {
				return jQuery.ajax({
					url: url + "/_api/web/SiteGroups?$select=Users&$expand=Users&$filter=Title eq '" + groupTitle + "'",
					method: "GET",
					headers: {
						"Accept": "application/json; odata=verbose"
					}
				})
				.then(function (data) {
					var results = data.d.results[0].Users.results;
					return results;
				});
			},
			currentUserIsMemberOfGroup: function (groupTitle) {
				return ns.SP.REST.Users.getGroupMembers(_spPageContextInfo.webAbsoluteUrl, groupTitle)
					.then(function (data) {
						var user = jQuery.grep(data, function (v, i) {
							return v.Id == _spPageContextInfo.userId; // _spPageContextInfo.userId is the current user's ID for the current site collection
						});
						var userIsMember = user.length > 0;
						return userIsMember;
					});
			},
			doesUserHavePermission: function (url, spPermissionKind) {
				var restEndpoint = url + "/_api/web/effectiveBasePermissions";
				return jQuery.ajax({
					url: restEndpoint,
					type: 'GET',
					dataType: 'json',
					beforeSend: function (xhr) {
						xhr.setRequestHeader("accept", "application/json; odata=verbose");
					}
				})
				.then(function (data) {
					var d = data.d;
					var permissions = new SP.BasePermissions();
					permissions.fromJson(d.EffectiveBasePermissions);
					return permissions.has(spPermissionKind);
				});
			},
			getUserId: function (url, loginName) {
				return jQuery.ajax({
					url: "{0}/_api/Web/SiteUsers(@v)?@v='{1}'".format(url, encodeURIComponent(loginName)),
					type: "GET",
					dataType: 'json',
					beforeSend: function (xhr) {
						xhr.setRequestHeader("accept", "application/json; odata=verbose");
					}
				})
				.then(function (data) {
					return data.d.Id;
				});
			},
			ensureUser: function (url, loginName) {
				return jQuery.ajax({
					url: "{0}/_api/Web/EnsureUser(@v)?@v='{1}'".format(url, encodeURIComponent(loginName)),
					type: "POST",
					dataType: 'json',
					headers: {
						"Accept": "application/json;odata=verbose",
						"X-RequestDigest": ns.SP.REST.getRequestDigest()
					}
				})
				.then(function (data) {
					return data.d.Id;
				});
			},
			getUserById: function (url, id) {
				return jQuery.ajax({
					url: "{0}/_api/Web/GetUserById({1})".format(url, id),
					type: "GET",
					dataType: 'json',
					beforeSend: function (xhr) {
						xhr.setRequestHeader("accept", "application/json; odata=verbose");
					}
				})
				.then(function (data) {
					return data.d.LoginName;
				});
			},
			getUserProperties: function (accountName) {
				return jQuery.ajax({
					url: "{0}/_api/SP.UserProfiles.PeopleManager/GetPropertiesFor(accountName=@v)?@v='{1}'".format(_spPageContextInfo.webAbsoluteUrl, encodeURIComponent(accountName)),
					type: "GET",
					dataType: 'json',
					beforeSend: function (xhr) {
						xhr.setRequestHeader("accept", "application/json; odata=verbose");
					}
				})
				.then(function (data) {
					var userProps = {};
					jQuery.each(data.d.UserProfileProperties.results, function(i,v) { userProps[v.Key] = v.Value; });
					return userProps;
				});
			}
		},
		getRequestDigest: function () {
			UpdateFormDigest(_spPageContextInfo.webServerRelativeUrl, _spFormDigestRefreshInterval);
			return jQuery('#__REQUESTDIGEST').val();
		}
	};
})();