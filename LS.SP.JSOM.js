(function() {
	var nsName = "LS"; // root namespace name
	var ns = window[nsName]; // root namespace alias
	var utils = ns.Utils; // utils alias
	ns.SP = ns.SP || {};

	ns.SP.JSOM = {
		Data: {
			Sites: {} // cache for Taxonomy terms JSON
		},
		Lists: {
			getLists: function() {
				// get lists for the current web
				var ctx = SP.ClientContext.get_current(),
					lists = ctx.get_web().get_lists();
				ctx.load(lists);
				return ns.SP.JSOM.executeQuery(ctx, lists, true);
			},
			getList: function(siteUrl, listTitle) {
				// example usage
				// ns.SP.JSOM.GetList("http://siteurl", "Site Assets")
				// .then(function (list) {
				// LogMsg(list.get_title());
				// }); 

				var ctx = siteUrl != _spPageContextInfo.webAbsoluteUrl ? new SP.ClientContext(siteUrl) : SP.ClientContext.get_current(),
					list = ctx.get_web().get_lists().getByTitle(listTitle);
				ctx.load(list);
				return ns.SP.JSOM.executeQuery(ctx, list);
			},
			getListById: function(siteUrl, listId) {
				// example usage
				// ns.SP.JSOM.GetList("http://siteurl", "(guid)")
				// .then(function (list) {
				// LogMsg(list.get_title());
				// }); 

				var ctx = siteUrl != _spPageContextInfo.webAbsoluteUrl ? new SP.ClientContext(siteUrl) : SP.ClientContext.get_current(),
					list = ctx.get_web().get_lists().getById(listId);
				ctx.load(list);
				return ns.SP.JSOM.executeQuery(ctx, list);
			},
			Items: {
				getItemById: function(list, id) {
					var ctx = list.get_context(),
						item = list.getItemById(id);
					ctx.load(item);
					return ns.SP.JSOM.executeQuery(ctx, item);
				},
				getItems: function(list, caml) {
					var ctx = list.get_context(),
						camlQuery = new SP.CamlQuery();
					camlQuery.set_viewXml(caml);
					var items = list.getItems(camlQuery);
					ctx.load(items);
					return ns.SP.JSOM.executeQuery(ctx, items, true);
				},
				add: function(list, data) {
					var ctx = list.get_context(),
						itemCreateInfo = new SP.ListItemCreationInformation(),
						newItem = list.addItem(itemCreateInfo);
					jQuery.each(data, function(key, value) {
						newItem.set_item(key, value);
					});
					newItem.update();
					return ns.SP.JSOM.executeQuery(ctx, newItem);
				},
				update: function(list, id, data) {
					var ctx = list.get_context();

					function setData(item) {
						jQuery.each(data, function(key, value) {
							item.set_item(key, value);
						});
						item.update();
						return ns.SP.JSOM.executeQuery(ctx, item);
					}

					return ns.SP.JSOM.Lists.Items.getItemById(list, id)
						.then(setData);
				},
				delete: function(list, id) {
					var ctx = list.get_context();

					function deleteItem(item) {
						item.deleteObject();
						return ns.SP.JSOM.executeQuery(ctx);
					}

					return ns.SP.JSOM.Lists.Items.getItemById(list, id)
						.then(deleteItem);
				},
				like: function(list, id, like) {
					var ctx = list.get_context();

					function setLike() {
						var reputation = Microsoft.Office.Server.ReputationModel.Reputation;
						reputation.setLike(ctx, list.get_id().toString(), id, like);
						return ns.SP.JSOM.executeQuery(ctx);
					}

					return ns.SP.JSOM.loadReputationScripts()
						.then(setLike);
				},
				rate: function(list, id, rating) {
					var ctx = list.get_context();

					function setRating() {
						var reputation = Microsoft.Office.Server.ReputationModel.Reputation;
						reputation.setRating(ctx, list.get_id().toString(), id, rating);
						return ns.SP.JSOM.executeQuery(ctx);
					}

					return ns.SP.JSOM.loadReputationScripts()
						.then(setRating);
				},
				UserField: {
					contains: function(item, fieldName, user) {
						var userField = item.get_fieldValues()[fieldName];
						return userField !== null ?
							jQuery.grep(userField, function(userValue, i) {
								return userValue.get_lookupId() == user.get_id();
							}).length > 0 : false;
					},
					add: function(item, fieldName, user) {
						var userField = item.get_fieldValues()[fieldName],
							fieldUserValue = new SP.FieldUserValue(),
							data = {};
						fieldUserValue.set_lookupId(user.get_id());
						userField.push(fieldUserValue);
						data[fieldName] = userField;
						return ns.SP.JSOM.Lists.Items.update(item.get_parentList(), item.get_id(), data);
					},
					remove: function(item, fieldName, user) {
						var userField = item.get_fieldValues()[fieldName],
							users = userField !== null ? jQuery.grep(userField, function(userValue, i) {
								return userValue.get_lookupId() !== user.get_id();
							}) : null,
							data = {};
						data[fieldName] = users;
						return ns.SP.JSOM.Lists.Items.update(item.get_parentList(), item.get_id(), data);
					}
				}
			},
			Fields: {
				getFields: function(list, propertyArray) {
					// example usage
					// ns.SP.JSOM.Lists.GetList("http://siteurl", "Site Assets")
					// .then(function (list) {
					// return ns.SP.JSOM.Lists.GetFields(list, ["Title", "InternalName"]);
					// }).then(function (data) {
					// LogMsg(data);
					// });

					var ctx = list.get_context(),
						fields = list.get_fields();
					if (propertyArray)
						ctx.load(fields, 'Include(' + propertyArray.join(', ') + ')');
					else
						ctx.load(fields);

					return ns.SP.JSOM.executeQuery(ctx, fields, true);
				},
				getFieldByInternalName: function(fields, internalFieldName) {
					// example usage
					//ns.SP.JSOM.Lists.GetList("http://siteurl", "Documents")
					//    .then(ns.SP.JSOM.GetFields)
					//    .then(function (data) { return ns.SP.JSOM.Lists.GetFieldByInternalName(data, "Title"); })
					//    .done(LogMsg);

					return jQuery.grep(fields, function(field, index) {
						return field.get_internalName() == internalFieldName;
					})[0];
				}
			}
		},
		Users: {
			doesUserHavePermission: function(ctx, spPermissionKind) {
				var web = ctx.get_web();
				ctx.load(web);
				ctx.load(web, 'EffectiveBasePermissions');
				return ns.SP.JSOM.executeQuery(ctx)
					.then(function() {
						return web.get_effectiveBasePermissions().has(spPermissionKind);
					});
			},
			getCurrent: function() {
				var ctx = SP.ClientContext.get_current(),
					user = ctx.get_web().get_currentUser();
				ctx.load(user);
				return ns.SP.JSOM.executeQuery(ctx, user);
			}
		},
		// get metadata terms for a term group, in the context of the specified site collection
		Taxonomy: {
			Sites: {}, // JSOM cache for Taxonomy objects
			getTerms: function(url, groupName) {
				var ctx,
					siteData = ns.SP.JSOM.Data.Sites[url] || {},
					siteObjects = ns.SP.JSOM.Taxonomy.Sites[url] || {};

				function getTermStores() {
					ctx = new SP.ClientContext(url);

					// load from sessionStorage if possible and return, or carry on and load from taxonomy term store...                
					var taxonomyJSONString = sessionStorage.getItem(nsName + ".SP.JSOM.Data.Sites[" + url + "]");
					if (taxonomyJSONString !== null) {
						siteData = JSON.parse(taxonomyJSONString);
						if (siteData.TermGroups[groupName]) {
							ns.SP.JSOM.Data.Sites[url] = siteData;
							LogMsg("Terms loaded from sessionStorage.");
							return jQuery.Deferred().reject().promise(); // don't continue the promise chain
						}
					}

					// Cache TaxonomySession as a global variable to avoid uninitialized error when making multiple requests against the term store (i.e. when querying more than one group)
					siteObjects.taxonomySession = siteObjects.taxonomySession || SP.Taxonomy.TaxonomySession.getTaxonomySession(ctx);
					siteObjects.termStores = siteObjects.taxonomySession.get_termStores();
					ctx.load(siteObjects.termStores);
					return ns.SP.JSOM.executeQuery(ctx, siteObjects.termStores, true);
				}

				function getTermGroups(termStores) {
					siteObjects.termStores = termStores;
					siteObjects.termStore = siteObjects.termStores[0];
					LogMsg("Retrieved term store '{0}'".format(siteObjects.termStore.get_name()));
					siteObjects.termGroups = siteObjects.termStore.get_groups();
					ctx.load(siteObjects.termGroups);
					LogMsg("Loading term groups");
					return ns.SP.JSOM.executeQuery(ctx, siteObjects.termGroups, true);
				}

				function getTermGroup(termGroups) {
					siteObjects.termGroups = termGroups;
					siteObjects.termGroup = jQuery.grep(siteObjects.termGroups, function(value, index) {
						return value.get_name() == groupName;
					})[0];
					if (siteObjects.termGroup) {
						LogMsg("Match '{0}' found, loading Term Group".format(siteObjects.termGroup.get_name()));
						ctx.load(siteObjects.termGroup);
						return ns.SP.JSOM.executeQuery(ctx);
					} else {
						LogMsg("Error: Term Group '{0}' not found".format(groupName));
						return jQuery.Deferred().reject().promise(); // don't continue the promise chain
					}
				}

				function getTermSets() {
					siteData.TermGroups = siteData.TermGroups || {};
					siteData.TermGroups[groupName] = {};
					siteObjects.termSets = siteObjects.termGroup.get_termSets();
					ctx.load(siteObjects.termSets);
					LogMsg("Getting Term Sets for group '{0}'".format(groupName));
					return ns.SP.JSOM.executeQuery(ctx, siteObjects.termSets, true);
				}

				function getAllTerms(termSets) {
					siteObjects.termSets = termSets;
					siteData.TermGroups[groupName].TermSets = siteData.TermGroups[groupName].TermSets || {};
					var termSetsPromises = jQuery.map(siteObjects.termSets, function(termSet, i) {
						return getTermsForTermSet(termSet); // load term set terms async
					});
					return jQuery.when.apply(jQuery, termSetsPromises) // when all terms are loaded
						.then(function() {
							ns.SP.JSOM.Data.Sites[url] = siteData;
							ns.SP.JSOM.Taxonomy.Sites[url] = siteObjects;
							return;
						})
						.done(function() {
							LogMsg("Terms loaded.");
							sessionStorage.setItem(nsName + ".SP.JSOM.Data.Sites[" + url + "]", JSON.stringify(siteData)); // cache in sessionStorage
							LogMsg("Terms cached in sessionStorage.");
						});
				}

				function getTermsForTermSet(termSet, termSetsPromises) {
					var termSetName = termSet.get_name();
					siteData.TermGroups[groupName].TermSets[termSetName] = {};
					siteData.TermGroups[groupName].TermSets[termSetName].Terms = siteData.TermGroups[groupName].TermSets[termSetName].Terms || {};
					LogMsg("Getting Terms for Term Set '{0}'".format(termSetName));
					var terms = termSet.get_terms(),
						termsGlobal = siteData.TermGroups[groupName].TermSets[termSetName].Terms;
					return getTermsRecursive(terms, termsGlobal);
				}

				function getTermsRecursive(terms, termsGlobal) {
					// populate global variable with terms and child terms recursively
					ctx.load(terms);
					return ns.SP.JSOM.executeQuery(ctx)
						.then(function() {
							return getTerms(terms, termsGlobal);
						});
				}

				function getTerms(terms, termsGlobal) {
					terms = ns.SP.JSOM.enumerableToArray(terms);

					var childTermsPromises = jQuery.map(terms, function(term, i) {
						var termName = term.get_name();
						termsGlobal[termName] = {};
						termsGlobal[termName].Label = termName;
						termsGlobal[termName].TermGuid = term.get_id().toString();

						// get child terms
						return term.get_termsCount() > 0 ? (function() {
							termsGlobal[termName].Terms = termsGlobal[termName].Terms || {};
							return getTermsRecursive(term.get_terms(), termsGlobal[termName].Terms);
						})() : null;
					});
					return jQuery.when.apply(jQuery, childTermsPromises);
				}

				return ns.SP.JSOM.loadMetadataScripts()
					.then(getTermStores)
					.then(getTermGroups)
					.then(getTermGroup)
					.then(getTermSets)
					.then(getAllTerms);
			}
		},
		Pages: {
			getPagesLibrary: function() {
				var ctx = SP.ClientContext.get_current(),
					url = _spPageContextInfo.webAbsoluteUrl,
					pageListId = _spPageContextInfo.pageListId.replace("{", "").replace("}", "");

				return ns.SP.JSOM.Lists.getListById(url, _spPageContextInfo.pageListId)
					.then(function(list) {
						ctx.load(list);
						return ns.SP.JSOM.executeQuery(ctx, list);
					});
			},
			getPage: function(pageLibrary, pageId) {
				return ns.SP.JSOM.Lists.Items.getItemById(pageLibrary, pageId);
			},
			getCurrent: function() {
				return ns.SP.JSOM.Pages.getPagesLibrary()
					.then(function(pageLibrary) {
						return ns.SP.JSOM.Pages.getPage(pageLibrary, _spPageContextInfo.pageItemId);
					});
			}
		},
		Social: {
			userCommentedOnCurrentPage: function() {
				var user,
					resultThread,
					ctx = SP.ClientContext.get_current(),
					feedMgr = new SP.Social.SocialFeedManager(ctx),
					getCurrentUser = ns.SP.JSOM.Users.getCurrent;

				function getCurrentPage(currentUser) {
					user = currentUser;
					return ns.SP.JSOM.Pages.getCurrent();
				}

				function createPost(page) {
					var pageTitle = page.get_fieldValues()["Title"];
					var pageUrl = window.location.href.split('?')[0].split('#')[0];

					var userDataItem = new SP.Social.SocialDataItem();
					userDataItem.set_itemType(SP.Social.SocialDataItemType.user);
					userDataItem.set_accountName(user.get_loginName());

					var linkDataItem = new SP.Social.SocialDataItem();
					linkDataItem.set_itemType(SP.Social.SocialDataItemType.link);
					linkDataItem.set_text(pageTitle);
					linkDataItem.set_uri(pageUrl);
					var socialDataItems = [userDataItem, linkDataItem];

					var postCreationData = new SP.Social.SocialPostCreationData();
					postCreationData.set_contentText('{0} commented on page {1}');
					postCreationData.set_contentItems(socialDataItems);
					postCreationData.set_source(linkDataItem);

					// null here indicates a root post
					resultThread = feedMgr.createPost(null, postCreationData);
					return ns.SP.JSOM.executeQuery(ctx, resultThread);
				}

				return ns.SP.JSOM.loadUserProfileScripts()
					.then(getCurrentUser)
					.then(getCurrentPage)
					.then(createPost);
			},
			userRepliedToPageComment: function(commentAuthor) {
				var user,
					resultThread,
					ctx = SP.ClientContext.get_current(),
					feedMgr = new SP.Social.SocialFeedManager(ctx),
					getCurrentUser = ns.SP.JSOM.Users.getCurrent;

				function getCurrentPage(currentUser) {
					user = currentUser;
					return ns.SP.JSOM.Pages.getCurrent();
				}

				function createPost(page) {
					var pageTitle = page.get_fieldValues()["Title"];
					var pageUrl = window.location.href.split('?')[0].split('#')[0];

					var currentUserLink = new SP.Social.SocialDataItem();
					currentUserLink.set_itemType(SP.Social.SocialDataItemType.user);
					currentUserLink.set_accountName(user.get_loginName());

					var authorUserLink = new SP.Social.SocialDataItem();
					authorUserLink.set_itemType(SP.Social.SocialDataItemType.user);
					authorUserLink.set_accountName(commentAuthor);

					var linkDataItem = new SP.Social.SocialDataItem();
					linkDataItem.set_itemType(SP.Social.SocialDataItemType.link);
					linkDataItem.set_text(pageTitle);
					linkDataItem.set_uri(pageUrl);

					var socialDataItems = [currentUserLink, authorUserLink, linkDataItem];

					var postCreationData = new SP.Social.SocialPostCreationData();
					postCreationData.set_contentText('{0} replied to a comment by {1} on page {2}');
					postCreationData.set_contentItems(socialDataItems);
					postCreationData.set_source(linkDataItem);

					// null here indicates a root post
					resultThread = feedMgr.createPost(null, postCreationData);
					return ns.SP.JSOM.executeQuery(ctx, resultThread);
				}

				return ns.SP.JSOM.loadUserProfileScripts()
					.then(getCurrentUser)
					.then(getCurrentPage)
					.then(createPost);

			},
			followPage: function() {
				var pageUrl = window.location.href.split('?')[0].split('#')[0];
				return ns.SP.JSOM.Social.followDocument(pageUrl);
			},
			followDocument: function(url) {
				var ctx = SP.ClientContext.get_current();
				var followingManager = new SP.Social.SocialFollowingManager(ctx);
				var socialActorInfo = new SP.Social.SocialActorInfo();
				socialActorInfo.set_actorType(SP.Social.SocialActorTypes.documents);
				socialActorInfo.set_contentUri(url);
				followingManager.follow(socialActorInfo);
				return ns.SP.JSOM.executeQuery(ctx);
			}
		},
		enumerableToArray: function(enumerable) {
			var enumerator = enumerable.getEnumerator();
			var array = [];
			while (enumerator.moveNext()) {
				var current = enumerator.get_current();
				array.push(current);
			}
			return array;
		},
		executeQuery: function(ctx, returnObject, toArray) {
			var def = new jQuery.Deferred();
			ctx.executeQueryAsync(function() {
				returnObject ?
					toArray ?
					def.resolve(ns.SP.JSOM.enumerableToArray(returnObject)) : // resolve returnObject as an array
					def.resolve(returnObject) : // resolve returnObject
					def.resolve(); // resolve undefined
			}, function(sender, args) {
				LogMsg(args);
				def.reject(args);
			});
			return def.promise();
		},
		Scripts: {
			Base: _spPageContextInfo.webAbsoluteUrl + "/_layouts/15/",
			CrossDomain: {
				Global: "SP.RequestExecutor",
				Scripts: ["sp.js", "sp.requestexecutor.js"]
			},
			Taxonomy: {
				Global: "SP.Taxonomy",
				Scripts: ["sp.js", "sp.taxonomy.js"]
			},
			UserProfiles: {
				Global: "SP.Social",
				Scripts: ["sp.js", "sp.userprofiles.js"]
			},
			Reputation: {
				Global: "Microsoft.Office.Server.ReputationModel.Reputation",
				Scripts: ["sp.js", "sp.core.js", "reputation.js"]
			}
		},
		ensureLibraries: function(scriptDependency) {
			var dfd = new jQuery.Deferred();
			if (!utils.globalExists(scriptDependency.Global)) {
				jQuery.each(scriptDependency.Scripts, function(i, url) {
					if (!ns.SP.JSOM.scriptIsLoaded(url)) {
						LogMsg("Loading script " + url);
						utils.addScript(ns.SP.JSOM.Scripts.Base + url);
					}
				});
			}

			utils.executeOnGlobal(scriptDependency.Global, function() {
				dfd.resolve();
			});
			return dfd.promise();
		},
		scriptIsLoaded: function(scriptFileName) {
			var scriptIsLoaded = false,
				scripts = jQuery("script");

			function getFileName(url) {
				return url.split('/').reverse()[0].toLowerCase();
			}

			scripts.each(function() {
				var script = jQuery(this);
				var url = script.attr("src");
				if (url !== undefined) {
					if (url.indexOf(".axd") == -1 && url.indexOf(".ashx") == -1) {
						var thisScriptFileName = getFileName(url);
						if (thisScriptFileName == scriptFileName.toLowerCase())
							scriptIsLoaded = true;
					}
				}
			});

			return scriptIsLoaded;
		},
		loadUserProfileScripts: function() {
			return ns.SP.JSOM.ensureLibraries(ns.SP.JSOM.Scripts.UserProfiles);
		},
		loadCrossDomainScripts: function() {
			return ns.SP.JSOM.ensureLibraries(ns.SP.JSOM.Scripts.CrossDomain);
		},
		loadMetadataScripts: function() {
			return ns.SP.JSOM.ensureLibraries(ns.SP.JSOM.Scripts.Taxonomy);
		},
		loadReputationScripts: function() {
			return ns.SP.JSOM.ensureLibraries(ns.SP.JSOM.Scripts.Reputation);
		},
		displayError: function(args) {
			LogMsg(args.get_message());
		}
	};
})();