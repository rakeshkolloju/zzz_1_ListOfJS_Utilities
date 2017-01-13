/*******************************************************************
*   @Author : Divesh singh Sai
*   @Description : UserProfile wrapper which helps
*   in getting current user and profile properties by passing account name.
*  ---------------------------------------------------------
*
*   
*********************************************************************/
var SFNetSPUtility = (function ($) {
    var ClientContext;
    //Private functions that is used by wrapper.
    function GenerateSoapQuery(AccountName) {
        var SoapEnv = "<?xml version='1.0' encoding='utf-8'?> \
                    <soap:Envelope xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:xsd='http://www.w3.org/2001/XMLSchema' xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'> \
                     <soap:Body> \
                     <GetUserProfileByName xmlns='http://microsoft.com/webservices/SharePointPortalServer/UserProfileService'> \
                     <AccountName>" + AccountName + "</AccountName> \
                    </GetUserProfileByName> \
                    </soap:Body> \
                    </soap:Envelope>";
        return SoapEnv;
    }
    function GetSP2010PeoplePickerValue(DisplayName) {
        var value = null;
        var Row = $("nobr").filter(function () {
            // Ensures we get a match whether or not the People Picker is required (if required, the nobr contains a span also)
            return $(this).contents().eq(0).text() === DisplayName;
        }).closest("tr");

        var Contents = Row.find("div[name='upLevelDiv']");
        if (Contents.children("span").length > 0) {
            Contents.children("span").each(function () {
                value = $(this).attr("title");
            });
        }
        else {
            value = Contents.text();
        }
        return value;
    }

    // Public Functions that are exposed by wrapper
    return {
        GetSharePointVersion: function (DisplayName, Value, callback) {
            var storageSharepointVersion = window && window.localStorage && window.localStorage.getItem("SharePointVersion");
            if (storageSharepointVersion) {
                return callback(DisplayName, Value, storageSharepointVersion, null)
            }
            else {
                ExecuteOrDelayUntilScriptLoaded(function () {
                    ClientContext = SP.ClientContext.get_current();
                    ClientContext.executeQueryAsync(function () {
                        var SharePointVersion = ClientContext.get_serverVersion();
                        if (window.localStorage)
                            window.localStorage.setItem("SharePointVersion", SharePointVersion);
                        callback(DisplayName, Value, SharePointVersion, null);
                    }, function (sender, args) {
                        callback(DisplayName, Value, null, args.get_message());
                    });
                }, "sp.js");
            }
        },
        GetCurrentUserDetails: function (options) {
            var successCallback = options.success;
            errorCallback = options.error;
            ExecuteOrDelayUntilScriptLoaded(function () {
                ClientContext = new SP.ClientContext.get_current();
                var web = ClientContext.get_web();
                var CurrentUser = web.get_currentUser();
                ClientContext.load(CurrentUser);
                ClientContext.executeQueryAsync(function () {
                    var CurrentUrl = window.location.protocol + "//" + window.location.host + "/" + ClientContext.get_url();
                    successCallback(CurrentUser, CurrentUrl, null);
                }, function (sender, args) {
                    errorCallback(args.get_message());
                });
            }, "sp.js");

        },
        GetQueryStringValue: function (QueryStringKey) {
            QueryStringKey = QueryStringKey.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + QueryStringKey + "=([^&#]*)");
            var results = regex.exec(location.search);
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        },
        /**************************************************
        * @Description : Returns all profile Properties for
        *               the current user.
        *
        *****************************************************/
        GetProfileProperties: function (options) {
            var AccountName = options.AccountName;
            successCallback = options.success;
            var Query = GenerateSoapQuery(AccountName);
            var Properites = new Array();
            var url = window.location.protocol + "//" + window.location.host + _spPageContextInfo.siteServerRelativeUrl;
            url += "/_vti_bin/UserProfileService.asmx";
            $.ajax({
                url: url,
                type: "POST",
                dataType: "xml",
                data: Query,
                complete: function (xData, Status) {
                    var x = $.parseXML(xData.responseText);
                    x = $(x);
                    $.map(x.find("PropertyData"), function (item) {
                        var PropertyName = $("Name", $(item)).text();
                        var PropertyValue = $("Value", $(item)).text();
                        Properites[PropertyName] = PropertyValue;
                    });
                    successCallback(Properites);
                },
                contentType: "text/xml; charset=\"utf-8\""
            });
        },
        GetCurrentUserProperities: function (options) {
            var callback = options.callback;
            var url = window.location.protocol + "//" + window.location.host + _spPageContextInfo.siteServerRelativeUrl;
            jQuery.ajax({
                url: url+"/_api/SP.UserProfiles.PeopleManager/GetMyProperties",
                type: "GET",
                headers: {
                    "accept": "application/json;odata=verbose",
                    "content-type": "application/json;odata=verbose",
                    "X-RequestDigest": $("#__REQUESTDIGEST").val()
                },
                success: function (data) {
                    callback(data);
                },

            });
        },
        CheckUserIsInGroup: function (options) {
            var CallBack = options.Callback;
            alias = options.alias;
            GroupId = options.GroupId;
            ExecuteOrDelayUntilScriptLoaded(function () {
                ClientContext = new SP.ClientContext.get_current();
                var UserInGroup = false;
                var GroupCollection = ClientContext.get_web().get_siteGroups();
                // Get the visitors group, assuming its ID is 4.
                var Group = GroupCollection.getById(GroupId);
                var CurrentUser = ClientContext.get_web().get_currentUser();
                var UserCollection = Group.get_users();
                ClientContext.load(CurrentUser);
                ClientContext.load(UserCollection);
                ClientContext.executeQueryAsync(function () {
                    var UserEnumerator = UserCollection.getEnumerator();
                    while (UserEnumerator.moveNext()) {
                        var User = UserEnumerator.get_current();
                        if (alias) {
                            if (User.get_loginName().toLowerCase().indexOf(alias.toLowerCase()) != -1) {
                                UserInGroup = true;
                                break;
                            }
                        }
                        else {
                            if (User.get_loginName() == CurrentUser.get_loginName()) {
                                UserInGroup = true;
                                break;
                            }
                        }
                    }
                    CallBack(UserInGroup, null);
                }, function (sender, args) { CallBack(UserInGroup, args.get_message()); });
            }, "sp.js");
        },
        SetPeoplePickerValue: function (DisplayName, Value, multiple) {
            if (_spPageContextInfo.webUIVersion == 15) {
                var peoplePickerDivId = $('div[title="' + DisplayName + '"]').attr("id");
                //Get people picker Object      
                var peoplePicker = this.SPClientPeoplePicker.SPClientPeoplePickerDict[peoplePickerDivId]; // where peoplepickerID is ID of the element people picker that you could set value.
                if (peoplePicker && Value.length > 0) {
                    if (!multiple)//&peoplePicker.GetAllUserInfo().length>0)
                        peoplePicker.DeleteProcessedUser();
                    peoplePicker.AddUserKeys(Value);
                }
            }
            else {
                var Row = $("nobr").filter(function () {
                    // Ensures we get a match whether or not the People Picker is required (if required, the nobr contains a span also)
                    return $(this).contents().eq(0).text() === DisplayName;
                }).closest("tr");

                var Contents = Row.find("div[name='upLevelDiv']");
                var CheckNames = Row.find("img[Title='Check Names']:first");

                // If a value was provided, set the valuee

                if (Value.length > 0) {
                    var existValues;
                    if (multiple && Contents.children("span").length > 0) {
                        Contents.children("span").each(function () {
                            existValues = $(this).attr("title");
                        });
                    }
                    else {
                        existValues = Contents.text();
                    }
                    Contents.html(existValues + Value);
                } else {
                	Contents.html("");
                }

                // If checkName is true, click the check names icon
                if (CheckNames) {
                    CheckNames.click();
                }
            }
        },
        AddButton: function (FieldName, ButtonName) {
            var Row = $("nobr").filter(function () {
                // Ensures we get a match whether or not the People Picker is required (if required, the nobr contains a span also)
                return $(this).contents().eq(0).text() === FieldName;
            }).closest("tr");
            Row.find('td:eq(1)').append('<input type="Button" value="' + ButtonName + '" style="padding:5px;margin-top:10px" onclick="RetriveInfo(this)" />');
        },
        GetPeoplePickerValue: function (DisplayName) {
            var value = null;
            if (_spPageContextInfo.webUIVersion == 15) {
                var peoplePickerDivId = $('div[title="' + DisplayName + '"]').attr("id");
                //Get people picker Object      
                var pushvalues = new Array();
                var peoplePicker = this.SPClientPeoplePicker.SPClientPeoplePickerDict[peoplePickerDivId]; // where peoplepickerID is ID of the element people picker that you could get value.
                var users = peoplePicker.GetAllUserInfo();
                if (users && users.length > 0) {
                    pushvalues.push(users[0].Description);
                }
                return pushvalues;
            }
            else {
                return GetSP2010PeoplePickerValue(DisplayName);
            }


        },
        HideColumn: function (DisplayName) {
            $("nobr:contains('" + DisplayName + "')").closest('tr').hide();

        },
        ShowColumn: function (DisplayName) {
            $("nobr:contains('" + DisplayName + "')").closest('tr').show();
        },
        BindRadioButtonEvent: function (options) {
            var DisplayName = options.DisplayName;
            CallBack = options.Callback;
            $("nobr:contains('" + DisplayName + "')").closest('tr').find(':radio').each(function () {
                $(this).click(function () {
                    var RadioId = $(this).attr("id");
                    var LblText = $("label[for=\"" + RadioId + "\"]").text();
                    CallBack(LblText);
                });
            });
        },
        GetRadioButtonValue: function (DisplayName) {
            var LblText = null;
            $("nobr:contains('" + DisplayName + "')").closest('tr').find(':radio').each(function () {
                var $this = $(this);
                if ($this.attr('CHECKED') == "checked") {
                    var radioId = $this.attr("id");
                    LblText = $("label[for=\"" + radioId + "\"]").text();
                }
            });
            return LblText;
        },
        HideDispFormColumn: function (DisplayName) {
            $("h3.ms-standardheader:contains('" + DisplayName + "')").closest('tr').hide();
        },
        GetDispFormColumnValue: function (DisplayName) {
            return $("h3.ms-standardheader:contains('" + DisplayName + "')").closest('td').next('td').text().trim();
        },
        GetCreatedBy: function (ListName, ItemId, Callback) {
            ExecuteOrDelayUntilScriptLoaded(function () {
                ClientContext = new SP.ClientContext.get_current();
                var web = ClientContext.get_web();
                var List = web.get_lists().getByTitle(ListName);
                var ListItem = List.getItemById(ItemId);
                ClientContext.load(ListItem);
                ClientContext.executeQueryAsync(function () {
                    var FieldUserValueCreatedBy = ListItem.get_item("Author");
                    Callback(FieldUserValueCreatedBy.get_lookupValue(), null);
                }, function (sender, args) {
                    Callback(null, args.get_message());
                });
            }, "sp.js");
        },
        SetTextBoxValue: function (DisplayName, Value) {
            $('input[title="' + DisplayName + '"]').val(Value);
        },
        GetTextBoxValue: function (DisplayName) {
            return $('input[title="' + DisplayName + '"]').val();
        },
        SetRichTextEditor: function (DisplayName, Value) {
            setTimeout(function () {
                $('td.ms-formbody').each(function (i, item) {
                    item = $(item);
                    if (item.html().indexOf('FieldName="' + DisplayName + '"') > -1) {
                        item.find("div[contenteditable='true']").html(Value);
                        return false;
                    }
                });
            }, 1500);
        },
        GetRichTextEditorValue: function (DisplayName) {
            var value;
            $('td.ms-formbody').each(function (i, item) {
                item = $(item);
                if (item.html().indexOf('FieldName="' + DisplayName + '"') > -1) {
                    value = item.find("div[contenteditable='true']").html();

                }
            });
            return value;
        },
        SetChoiceFieldValue: function (DisplayName, value) {
            $('select[title*="' + DisplayName + '"]').val(value);
        }

    }


}(jQuery));
