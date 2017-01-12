
var bestPractise1 = function () {
    var init = function (input1) {
        alert("init from bp1" + input1);
    };
    var show = function () { };
   return { init: init, show: show };
}();


/*          */
var bestPractise2 = bestPractise2 || {};
bestPractise2.test1Class = bestPractise2.test1Class || {};


bestPractise2.test1Class = function () {

    var test1ReturnObj = {
        init: function () { alert("init from bp2"); },
        show: function () { alert("show from bp2") }
    };
    return test1ReturnObj;
}



