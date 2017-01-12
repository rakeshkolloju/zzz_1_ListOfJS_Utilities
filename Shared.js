//"use strict";

var ELearn = ELearn || {};
ELearn.Shared = ELearn.Shared || {};
ELearn.Shared.CommonFunctions = ELearn.Shared.CommonFunctions || {};
ELearn.Shared.Utilities = function () {
    var appweburl, hostweburl;
    var publicMembers = {
        get_appweburl: function () { return appweburl; },
        set_appweburl: function (rhs) { appweburl = rhs; },
        GetListItem: function () {
            return $.ajax({
                url: url,
                method: "GET",
                headers: { "Accept": "application/json; odata=verbose" }

            }).promise();;
        },
        AddListItem: function (listname, metadata) {
            var dfd = $.Deferred();
            $.ajax({
                url: _spPageContextInfo.siteAbsoluteUrl + "/_api/web/lists/getbytitle('" + listname + "')/items",
                type: "POST",
                contentType: "application/json;odata=verbose",
                data: JSON.stringify(metadata),
                headers: {
                    "Accept": "application/json;odata=verbose",
                    "X-RequestDigest": $("#__REQUESTDIGEST").val()
                },
                success: function (data) {
                    dfd.resolve(data);
                },
                error: function (data) {
                    dfd.reject(data);
                }
            });
            return dfd.promise();
        }
    };
    return publicMembers;
}
ELearn.Shared.CommonFunctions = function () {
    var functions = {
        hideHeaders: function () {
            var elements = getElementsByClassName(document, "td", "ms-gb");
            var elem;
            console.log(elements.length);
            for (var i = 0; i < elements.length; i++) {
                elem = elements[i];
                elem.childNodes[0].childNodes[1].nodeValue = "";
                elem.childNodes[1].nodeValue = elem.childNodes[1].nodeValue.replace(':', '');
            }
            elements = getElementsByClassName(document, "td", "ms-gb2");
            console.log(elements.length);
            for (var i = 0; i < elements.length; i++) {
                elem = elements[i];
                elem.childNodes[1].childNodes[1].nodeValue = ""; elem.childNodes[2].nodeValue = elem.childNodes[2].nodeValue.replace(':', '');
            }
        },

        openBasicDialog: function (tUrl, tTitle) {
            var options = {
                url: tUrl,
                autoSize: true,
                width: 1000,
                height: 600,
                title: tTitle,
                allowMaximize: true,
                showClose: true
            };
            SP.SOD.execute('sp.ui.dialog.js', 'SP.UI.ModalDialog.showModalDialog', options);

        },
        openBasicDialogWithCloseCallBack: function (tUrl, tTitle) {
            var options = {
                url: tUrl,
                autoSize: true,
                title: tTitle,
                allowMaximize: true,
                showClose: true,
                dialogReturnValueCallback: onPopUpCloseCallBack
            };
            SP.SOD.execute('sp.ui.dialog.js', 'SP.UI.ModalDialog.showModalDialog', options);
            //SP.UI.ModalDialog.showModalDialog(options);
        }

    }
    function onPopUpCloseCallBack(result, returnValue) {
        if (result == SP.UI.DialogResult.OK) {
            SP.UI.ModalDialog.RefreshPage(SP.UI.DialogResult.OK);
        } else if (result == SP.UI.DialogResult.cancel) {
            SP.UI.ModalDialog.RefreshPage(SP.UI.DialogResult.OK);
        }
    }
    function getElementsByClassName(oElm, strTagName, strClassName) {
        var arrElements = (strTagName == "*" && oElm.all) ? oElm.all : oElm.getElementsByTagName(strTagName);
        var arrReturnElements = new Array();
        strClassName = strClassName.replace(/\-/g, "\\-");
        var oRegExp = new RegExp("(^|\\s)" + strClassName + "(\\s|$)");
        var oElement;
        for (var i = 0; i < arrElements.length; i++) {
            oElement = arrElements[i];
            if (oRegExp.test(oElement.className)) {
                arrReturnElements.push(oElement);
            }
        }
        return (arrReturnElements);
    }

    return functions;
}
(function () {

    var nsName = "LS"; // root namespace name
    var ns = window[nsName]; // root namespace alias
    var utils = ns.Utils; // utils alias
    ns.SP = ns.SP || {};

    ns.SP.JSOM = {
        Lists: {
            update: function (list, id, data) {
                var ctx = list.get_context();

                function setData(item) {
                    jQuery.each(data, function (key, value) {
                        item.set_item(key, value);
                    });
                    item.update();
                    return ns.SP.JSOM.executeQuery(ctx, item);
                }

                return ns.SP.JSOM.Lists.Items.getItemById(list, id)
                    .then(setData);
            }
        },

        executeQuery: function (ctx, returnObject, toArray) {
            var def = new jQuery.Deferred();
            ctx.executeQueryAsync(function () {
                returnObject ? toArray ? def.resolve(ns.SP.JSOM.enumerableToArray(returnObject)) : // resolve returnObject as an array
                    def.resolve(returnObject) : // resolve returnObject
                    def.resolve(); // resolve undefined
            }, function (sender, args) {
                LogMsg(args);
                def.reject(args);
            });
            return def.promise();
        }

    }
});


function MakeHyperLinksToText() {
    $("td.ms-formbody").find('[href]').each(function (i, el) {

        var newNode = $("<span>" + $(this).html() + "</span>");
        $(el).replaceWith(newNode);
    });
}
function ApplyOverDue(tableName) {
    if (tableName != undefined) {

        $("table[summary='" + tableName + "'] > tbody > tr").each(function (i) {
            var tdDueDate = $(this).children("td:eq(4)");
            var tdTaskStatus = $(this).children("td:eq(5)");

            var dueDate = tdDueDate.text();
            var taskStatus = tdTaskStatus.text();
            if (dueDate != "" && taskStatus == "Active") {
                if (isOverDue(dueDate)) { tdDueDate.children().css("color", "#bf0000") }
            }
        });
    }
}

function ApplyOverDue(tableName, dueDateRowNum, taskStatusRowNum) {
    if (tableName != undefined) {

        $("table[summary='" + tableName + "'] > tbody > tr").each(function (i) {
            var tdDueDate = $(this).children("td:eq(" + dueDateRowNum + ")");
            var tdTaskStatus = $(this).children("td:eq(" + taskStatusRowNum + ")");

            var dueDate = tdDueDate.text();
            var taskStatus = tdTaskStatus.text();
            if (dueDate != "" && taskStatus == "Active") {
                if (isOverDue(dueDate)) { tdDueDate.children().css("color", "#bf0000") }
            }
        });
    }
}


function isOverDue(dueDate) {
    var arrDate = dueDate.split("/");
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var dateValue = new Date(parseInt(arrDate[2], 10),     // year
                         parseInt(arrDate[0], 10) - 1, // month, starts with 0
                         parseInt(arrDate[1], 10));    // day
    // console.log(dateValue);
    return (dateValue < today);
}
//function isOverDue(dueDate) {
// var arrDate = dueDate.split("/");
// var today = new Date();
// dateValue = new Date(arrDate[2], --arrDate[0], arrDate[1]);
// return (dateValue < today);
// }

$(document).ready(function () {

    $("#onetgetParameterByNameidinfoblockV").hide();


});
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function openBasicDialog(tUrl, tTitle) {
    //var options = {
    //    url: tUrl,
    //    title: tTitle
    //};
    //SP.UI.ModalDialog.showModalDialog(options);

    var options = {
        url: tUrl,
        autoSize: true,
        width: 1000,
        height: 600,
        title: tTitle,
        allowMaximize: true,
        showClose: true
    };
    SP.SOD.execute('sp.ui.dialog.js', 'SP.UI.ModalDialog.showModalDialog', options);
    //SP.UI.ModalDialog.showModalDialog(options);
}

function GetListItemByReqUrl(url) {

    return $.ajax({
        url: url,
        method: "GET",
        headers: { "Accept": "application/json; odata=verbose" }

    }).promise();;

}

function GetListItemById(itemId, listName, siteurl) {

    var url = siteurl + "/_api/web/lists/getbytitle('" + listName + "')/items?$filter=Id eq " + itemId;
    return $.ajax({
        url: url,
        method: "GET",
        headers: { "Accept": "application/json; odata=verbose" }

    }).promise();;

}

function DeleteListItem(itemId, listName, siteurl) {

    var url = siteurl + "/_api/web/lists/getbytitle('" + listName + "')/items(" + itemId + ")";
    //var itemPayload = {
    //    '__metadata': { 'type': getItemTypeForListName(listTitle) }
    //};
    var dfd = $.Deferred();
    $.ajax({
        url: url,
        type: "POST",
        headers: {
            "Accept": "application/json;odata=verbose",
            "X-Http-Method": "DELETE",
            "X-RequestDigest": $("#__REQUESTDIGEST").val(),
            "If-Match": "*",
            "X-HTTP-Method": "DELETE"
        },
        success: function (data) {
            dfd.resolve(data);
            // success(data);
        },
        error: function (data) {
            // failure(data);
            dfd.reject(data);
        }
    });
    return dfd.promise();

}

function GetPrincipleIdByEmail(emailID, siteurl) {
    //https://siteUrl/_api/web/siteusers?$filter=Email eq 'emailID'
    var url = siteurl + "/_api/web/siteusers?$filter=Email eq '" + emailID + "'";
    return $.ajax({
        url: url,
        method: "GET",
        headers: { "Accept": "application/json; odata=verbose" }

    }).promise();;

}


function GetCurrentUser() {

    var url = _spPageContextInfo.webAbsoluteUrl + "/_api/web/currentuser";
    return $.ajax({
        url: url,
        method: "GET",
        headers: { "Accept": "application/json; odata=verbose" }

    }).promise();;

}



function sendEmail(from, to, body, subject) {
    //Get the relative url of the site
    var siteurl = _spPageContextInfo.webServerRelativeUrl;
    var urlTemplate = siteurl + "/_api/SP.Utilities.Utility.SendEmail";
    $.ajax({
        contentType: 'application/json',
        url: urlTemplate,
        type: "POST",
        data: JSON.stringify({
            'properties': {
                '__metadata': {
                    'type': 'SP.Utilities.EmailProperties'
                },
                'From': from,
                'To': {
                    'results': [to]
                },
                'Body': body,
                'Subject': subject
            }
        }),
        headers: {
            "Accept": "application/json;odata=verbose",
            "content-type": "application/json;odata=verbose",
            "X-RequestDigest": jQuery("#__REQUESTDIGEST").val()
        },
        success: function (data) {
            // alert('Email Sent Successfully');
        },
        error: function (err) {
            alert('Error in sending Email: ' + JSON.stringify(err));
        }
    });
}


// Getting the item type for the list
function getListItemType(name) {
  
        return "SP.Data." + name[0].toUpperCase() + name.substring(1) + "ListItem";
}
// Adding a list item with the metadata provided
function addListItem(url, listname, metadata, success, failure) {

    // Prepping our update
    var item = $.extend({
        "__metadata": { "type": getListItemType(listname) }
    }, metadata);

    // Executing our add
    $.ajax({
        url: url + "/_api/web/lists/getbytitle('" + listname + "')/items",
        type: "POST",
        contentType: "application/json;odata=verbose",
        data: JSON.stringify(item),
        headers: {
            "Accept": "application/json;odata=verbose",
            "X-RequestDigest": $("#__REQUESTDIGEST").val()
        },
        success: function (data) {
            success(data); // Returns the newly created list item information
        },
        error: function (data) {
            failure(data);
        }
    });

}



function FixLeftNav() {
    var listItems = $("ul[id$='_RootAspMenu'] li");
    //console.log(listItems.length);
    listItems.each(function (index, li) {
        var aI = $(li).find("a");
        //console.log(index);
        if ($(aI).attr('href') === "HomePage.aspx") {
            //console.log("Found");
            $(aI).addClass("ms-core-listMenu-selected");
        }
        else {
            $(aI).removeClass("ms-core-listMenu-selected");
        }
    });
}


function ShowOrHideActions(isShow) {

    if (isShow) {

        //Hide the Commit butoon.
        $("#Ribbon\\.ListForm\\.Edit\\.Commit").show();
        $("#Ribbon\\.ListForm\\.Edit\\.Actions").show();

        //Hide the default Save and Cancel buttons
        $('input[name$="IOSaveItem"]').show();
    }
    else {
        //Hide the Commit butoon.
        $("#Ribbon\\.ListForm\\.Edit\\.Commit").hide();
        $("#Ribbon\\.ListForm\\.Edit\\.Actions").hide();

        //Hide the default Save and Cancel buttons
        $('input[name$="IOSaveItem"]').hide();
    }

}

function ClearAllUsersFromPeoplePicker(fieldName) {
    var getIDPeoplePicker = $('div[title="' + fieldName + '"]').attr("id");
    var ppobject = SPClientPeoplePicker.SPClientPeoplePickerDict[getIDPeoplePicker];
    var usersobject = ppobject.GetAllUserInfo();
    usersobject.forEach(function (index) {
        ppobject.DeleteProcessedUser(usersobject[index]);
    });
}
var _doPostBack = function () {
    // var dfd = $.Deferred();
    var selectedViewId = ctx.view;
    var controlId = 'ctl00$m$g_' + selectedViewId.toLowerCase().replace(/-/g, "_").replace(/{|}/g, "") + '$ctl02';
    console.log(controlId);
    __doPostBack(controlId, 'cancel');
    return false;

}