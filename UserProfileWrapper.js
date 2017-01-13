/*******************************************************************
*   @Author : Divesh singh Sai
*   @Description : UserProfile wrapper which helps
*   in getting current user and profile properties by passing account name.
*  ---------------------------------------------------------
*
*   
*********************************************************************/
var UserProfileWrapper = (function ($) {
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
        GetCurrentUserDetails: function (Callback) {
            ExecuteOrDelayUntilScriptLoaded(function () {
                ClientContext = new SP.ClientContext.get_current();
                var web = ClientContext.get_web();
                var CurrentUser = web.get_currentUser();
                ClientContext.load(CurrentUser);
                ClientContext.executeQueryAsync(function () {
                    var CurrentUrl = window.location.protocol + "//" + window.location.host + "/" + ClientContext.get_url();
                    Callback(CurrentUser, CurrentUrl, null);
                }, function (sender, args) {
                    Callback(null, null, args.get_message());
                });
            }, "sp.js");

        },
        GetQueryStringValue: function (QueryStringKey) {
            QueryStringKey = QueryStringKey.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
            var regex = new RegExp("[\\?&]" + QueryStringKey + "=([^&#]*)");
            var results = regex.exec(location.search);
            return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        },
        GetProfileProperities: function (AccountName, url, Callback) {
            var Query = GenerateSoapQuery(AccountName);
            var Properites = new Array();
            $.ajax({
                url: url,
                type: "POST",
                async: false,
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
                    Callback(Properites);
                },
                contentType: "text/xml; charset=\"utf-8\""
            });
        },
        CheckUserIsInGroup: function (GroupId, CallBack) {
            ExecuteOrDelayUntilScriptLoaded(function () {
                ClientContext = new SP.ClientContext.get_current();
                var UserInGroup = false;
                var GroupCollection = ClientContext.get_web().get_siteGroups();
                // Get the visitors group, assuming its ID is 4.
                var Group = GroupCollection.getById(5);
                var CurrentUser = ClientContext.get_web().get_currentUser();
                var UserCollection = Group.get_users();
                ClientContext.load(CurrentUser);
                ClientContext.load(UserCollection);
                ClientContext.executeQueryAsync(function () {
                    var UserEnumerator = UserCollection.getEnumerator();
                    while (UserEnumerator.moveNext()) {
                        var User = UserEnumerator.get_current();
                        if (User.get_loginName() == CurrentUser.get_loginName()) {
                            UserInGroup = true;
                            break;
                        }
                    }
                    CallBack(UserInGroup, null);
                }, function (sender, args) { CallBack(UserInGroup, args.get_message()); });
            }, "sp.js");
        },
        SetPeoplePickerValue: function (DisplayName, Value,multiple) {
            this.GetSharePointVersion(DisplayName, Value, function (DisplayName, Value, version) {
                if (version.indexOf(15.0) != -1) {
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
                        Contents.html(Value);
                    }

                    // If checkName is true, click the check names icon
                    if (CheckNames) {
                        CheckNames.click();
                    }
                }
            });
        },
        AddButton: function (FieldName, ButtonName) {
            var Row = $("nobr").filter(function () {
                // Ensures we get a match whether or not the People Picker is required (if required, the nobr contains a span also)
                return $(this).contents().eq(0).text() === FieldName;
            }).closest("tr");
            Row.find('td:eq(1)').append('<input type="Button" value="' + ButtonName + '" style="padding:5px;margin-top:10px" onclick="RetriveInfo(this)" />');
        },
        GetPeoplePickerValue: function (DisplayName, callback) {

            if (callback) {
                this.GetSharePointVersion(DisplayName, null, function (DisplayName, value, version) {
                    var value = null;
                    if (version.indexOf(15.0) != -1) {
                        var peoplePickerDivId = $('div[title="' + DisplayName + '"]').attr("id");
                        //Get people picker Object      
                        var peoplePicker = this.SPClientPeoplePicker.SPClientPeoplePickerDict[peoplePickerDivId]; // where peoplepickerID is ID of the element people picker that you could get value.
                        var users = peoplePicker.GetAllUserInfo();
                        value = (users && users.length > 0) ? users[0].Description : null;

                    }
                    else {
                        value = GetSP2010PeoplePickerValue(DisplayName);
                    }
                    callback(value);
                });
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
        RadioButtonEvent: function (DisplayName, CallBack) {
            $("nobr:contains('" + DisplayName + "')").closest('tr').find(':radio').each(function () {
                $(this).click(function () {
                    var RadioId = $(this).attr("id");
                    var LblText = $("label[for=\"" + RadioId + "\"]").text();
                    CallBack(LblText);
                });
            });
        },
        GetRadioButtonValue: function (DisplayName) {
            var LblText = null
            $("nobr:contains('" + DisplayName + "')").closest('tr').find(':radio').each(function () {
                var $this = $(this);
                if ($this.attr('checked') == "checked") {
                    var radioId = $this.attr("id");
                    LblText = $("label[for=\"" + radioId + "\"]").text();

                }
            });
            return LblText;
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
        }

    }


}(jQuery));
