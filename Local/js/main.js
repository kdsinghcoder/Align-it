var GridBuilder = (function () {
    "use strict";
    var isFirstLoad = true,
        mSelf = null,
        mCurrentPath = [],
        mPathTable = [],
        mCellMap = {},
        mTopSequence = "",
        mSideSequence = "",
        mDomGridTable = null,
        mDomAlignmentTable = null,
        mDomContainer = null,
        mDomResultContainer = null,
        mGapSymbol = "-",
        mIsCustomPathMode = false,
        mMatchScore = 0,
        mMismatchScore = 0,
        mGapScore = 0,
        mIndexOfMaxValue = [],
        maxValue = 0,
        mIsFindZero = false;

    function onCellClicked(dom, x, y) {
        x = parseInt(x, 10);
        y = parseInt(y, 10);

        var lastElement = null;
        dom.attr('data-index', mCurrentPath.length);
        // console.log('mCurrentPath length = ', mCurrentPath.length);

        if(x<=mIndexOfMaxValue[0] && y<=mIndexOfMaxValue[1] && mIsFindZero==false){
            mCurrentPath.push({
                'idx': mCurrentPath.length,
                'x': x,
                'y': y,
                'dom': dom,
                'previous': lastElement
            });

            if (lastElement) {
                lastElement.dom.removeClass('is-last');
            }
        
            if(mPathTable[x][y]==0){
                mIsFindZero=true;
                dom.addClass('is-last');
            }
            dom.addClass('in-path');
        }            
        onPathUpdate();
        return true;
    }

    function onPathUpdate() {
        var alignedTopSeq = '';
        var alignedSideSeq = '';

        $('th').removeClass('included');
        // console.log('mCurrentPath.length = ',mCurrentPath.length);
        for (var i = mCurrentPath.length - 1; i >= 0; i--) {
            
            var currentCell = mCurrentPath[i];
            var nextCell = (i > 0) ? mCurrentPath[i - 1] : null;

            var topChar = mTopSequence[currentCell.x];
            var sideChar = mSideSequence[currentCell.y];
            
            if (!nextCell) {
                continue;
            }

            if(topChar){
                if(currentCell.x != nextCell.x){
                    $('#top_seq_' + (currentCell.x)).addClass('included');
                }
            }

            if(sideChar){
                if(currentCell.y != nextCell.y){
                    $('#side_seq_' + (currentCell.y)).addClass('included');
                }
            }

            //Diagonal move
            if (nextCell.x - currentCell.x > 0 && nextCell.y - currentCell.y > 0) {
                alignedTopSeq += topChar;
                alignedSideSeq += sideChar;
                continue;
            }

            //Horizontal
            if (nextCell.x - currentCell.x > 0) {
                sideChar = mGapSymbol;
            }

            //Vertical move
            if (nextCell.y - currentCell.y > 0) {
                topChar = mGapSymbol;
            }

            alignedTopSeq += topChar;
            alignedSideSeq += sideChar;
        }

        $('#alignment').remove();

        var $table = $('<table />').attr('id', 'alignment');
        mDomAlignmentTable = $table;

        var score = 0;
        var $tr = $('<tr />');
        for (var idxTop in alignedTopSeq) {
            var c1 = alignedTopSeq[idxTop];
            var c2 = alignedSideSeq[idxTop];

            if (c1 === mGapSymbol || c2 === mGapSymbol) {
                score += mGapScore;
            } else if (c1 === c2) {
                score += mMatchScore;
            } else {
                score += mMismatchScore;
            }
            $tr.append($('<td />').html(c1));
        }
        $table.append($tr);

        $tr = $('<tr />');
        for (var idxSide in alignedSideSeq) {
            $tr.append($('<td />').html(alignedSideSeq[idxSide]));
        }
        $table.append($tr);

        $tr = $('<tr />');
        $tr.append($('<td colspan="1500" class="score" />').html("Score = " + score));
        $table.append($tr);

        mDomResultContainer.append($table);
    }

    function displayTooltip(text, x, y) {
        if ($('#tooltip').length === 0) {
            $('body').prepend($('<div />').attr('id', 'tooltip'));
        }
        var tt = $('#tooltip').html("");
        var tooltipHeight = 30;

        var xBorder = x + tt.width() + 30;
        if (xBorder > $(window).width()) x -= (xBorder - $(window).width());

        var yBorder = y + tt.height() + 30;
        if (yBorder > $(window).height()) y -= (tooltipHeight * 2);

        tt.append(text);
        tt.css('left', x);
        tt.css('top', y);
        tt.css('display', 'block');
    }

    function hideTooltip() {
        $('#tooltip').css('display', 'none');
    }

    function showTooltip(x, y) {
        var targetCell = mCellMap[x + "_" + y];
        var $table = $("<table />");

        var $tr = $("<tr />");
        $tr.append(
            $("<td />").html("<b><u>Diagonal</u></b> <br> " + targetCell.diagonalScoreText)
        ).append(
            $("<td />").html("<b><u>Upper</u></b> <br> " + targetCell.upScoreText)
        );
        $table.append($tr);

        $tr = $("<tr />");
        $tr.append(
            $("<td />").html("<b><u>Side</u></b> <br> " + targetCell.sideScoreText)
        ).append(
            $("<td />").html("Winning (max) score is " + targetCell.winningScore)
        );
        $table.append($tr);

        $('#' + (x - 1) + '_' + (y - 1)).addClass('highlight');
        $('#' + (x - 0) + '_' + (y - 1)).addClass('highlight');
        $('#' + (x - 1) + '_' + (y - 0)).addClass('highlight');

        var targetDom = $('#' + x + '_' + y);
        var pos = targetDom.offset();
        targetDom.addClass('highlight-main');
        displayTooltip($table, pos.left + targetDom.width() + 10, pos.top - targetDom.height() / 2);
    }

    function getCssClassesFromDirection(directions) {
        var cssClasses = "";
        if(!Array.isArray(directions)){
            return cssClasses;
        }
        cssClasses = directions.join(' ');

        return cssClasses;
    }

    function constructNRowGlobal(n) {
        // For global
        var $table = $('#grid');
        var charIndex = parseInt(n, 10) - 1;
        var $tr = $('<tr />');
        var $th = null;

        if (charIndex >= 0) {
            $th = $('<th />')
                .addClass("seq-header")
                .addClass("side-header")
                .attr('id', 'side_seq_' + charIndex)
                .html(mSideSequence[charIndex]);
            $tr.append($th);
        } else {
            $th = $('<th />');
            $tr.append($th);
        }

        var $td = $('<td />')
            .html(mCellMap[0 + "_" + n].winningScore)
            .attr('data-x', 0)
            .attr('data-y', n)
            .attr('id', 0 + "_" + n);
        $tr.append($td);

        for (var idx in mTopSequence) {
            idx = parseInt(idx, 10);
            var dataPointIndex = (idx + 1) + '_' + (charIndex + 1);
            
            var cssClasses = "";
            if(n > 0){
                cssClasses = getCssClassesFromDirection(mCellMap[(idx+1) + "_" + (charIndex+ 1)].direction);
            }

            $td = $('<td />')
                .addClass(cssClasses)
                .html(mCellMap[dataPointIndex].winningScore)
                .attr('data-x', (idx + 1))
                .attr('data-y', (charIndex + 1))
                .attr('data-dg', mCellMap[dataPointIndex].diagonalScoreText)
                .attr('data-up', mCellMap[dataPointIndex].upScoreText)
                .attr('data-sd', mCellMap[dataPointIndex].sideScoreText)
                .attr('id', dataPointIndex);
            $tr.append($td);
        }

        $table.append($tr);
        mDomContainer.append($table);

    }

    function constructNRowLocal(n,isMax) {
        // console.log(mIndexOfMaxValue);
        var $table = $('#grid');
        var charIndex = parseInt(n, 10) - 1;
        var $tr = $('<tr />');
        var $th = null;

        if (charIndex >= 0) {
            $th = $('<th />')
                .addClass("seq-header")
                .addClass("side-header")
                .attr('id', 'side_seq_' + charIndex)
                .html(mSideSequence[charIndex]);
            $tr.append($th);
        } else {
            $th = $('<th />');
            $tr.append($th);
        }

        var $td = $('<td />')
            .html(mCellMap[0 + "_" + n].winningScore)
            .attr('data-x', 0)
            .attr('data-y', n)
            .attr('id', 0 + "_" + n);
        $tr.append($td);

        for (var idx in mTopSequence) {
            if(isMax && idx==mIndexOfMaxValue[1]){
                // console.log('is max', n,'-',idx);
            }
            idx = parseInt(idx, 10);
            var dataPointIndex = (idx + 1) + '_' + (charIndex + 1);
            
            var cssClasses = "";
            if(n > 0){
                cssClasses = getCssClassesFromDirection(mCellMap[(idx+1) + "_" + (charIndex+ 1)].direction);
            }

            $td = $('<td />')
                .addClass(cssClasses)
                .html(mCellMap[dataPointIndex].winningScore)
                .attr('data-x', (idx + 1))
                .attr('data-y', (charIndex + 1))
                .attr('data-dg', mCellMap[dataPointIndex].diagonalScoreText)
                .attr('data-up', mCellMap[dataPointIndex].upScoreText)
                .attr('data-sd', mCellMap[dataPointIndex].sideScoreText)
                .attr('id', dataPointIndex);
            $tr.append($td);
        }

        $table.append($tr);
        mDomContainer.append($table);
    }

    function constructGridGlobal() {
        // For global
        $('#alignment').remove();
        $('#grid').remove();
        var $table = $('<table />').attr('id', 'grid');
        mDomGridTable = $table;
        mDomContainer.append($table);

        var $tr = $('<tr />');

        var $th = $('<th />');
        $tr.append($th);

        $th = $('<th />');
        $tr.append($th);

        for (var idx in mTopSequence) {
            $th = $('<th />');
            $th.attr('id', 'top_seq_' + idx);
            $th.addClass("seq-header");
            $th.addClass("top-header");
            $th.html(mTopSequence[idx]);
            $tr.append($th);
        }

        $table.append($tr);

        for (var i = 0; i < mSideSequence.length + 1; i++) {
            constructNRowGlobal(i);
        }

        $('#grid td').click(function() {
            var self = $(this);
            onCellClicked(
                self,
                self.attr('data-x'),
                self.attr('data-y')
            );
        });

        $('#grid td').hover(function() {
            
            if (mIsCustomPathMode) {
                return;
            }
            
            var self = $(this);
            var x = self.attr('data-x');
            var y = self.attr('data-y');
            
            if (x < 1 || y < 1) {
                return;
            }
            //console.log(           "#side_seq_" + (y -1));
            //console.log(           "#top_seq_" + (x -1));
            $("#side_seq_" + (y-1)).addClass('highlight');
            $("#top_seq_" + (x-1)).addClass('highlight');
            
            showTooltip(x, y);
        
        }, function() {
        
            $(".seq-header").removeClass('highlight');
            $('#grid td').removeClass('highlight');
            $('#grid td').removeClass('highlight-main');
            hideTooltip();
            
        });

        $('#grid th').hover(function() {
            
            var self = $(this);
            if(!self.hasClass("seq-header")){
                return;
            }
            
            var pos = self.offset();
            var topMargin = self.hasClass("side-header")?self.height()/4:self.height() + 4;
            var leftMargin = self.hasClass("side-header")?self.width() + 4:0;
            var text = self.hasClass("included")?"Included In Alignment":"Not Included In Alignment";
            
            displayTooltip(text, pos.left + leftMargin, pos.top + topMargin );
            
        }, function() {
            hideTooltip();
        });

    }

    function constructGridLocal() {
        // console.log(mIndexOfMaxValue);
        $('#alignment').remove();
        $('#grid').remove();
        var $table = $('<table />').attr('id', 'grid').addClass('seq-table table-bordered');
        mDomGridTable = $table;
        mDomContainer.append($table);

        var $tr = $('<tr />');
        var $th = $('<th />');
        $tr.append($th);

        $th = $('<th />');
        $tr.append($th);

        for (var idx in mTopSequence) {
            $th = $('<th />');
            $th.attr('id', 'top_seq_' + idx);
            $th.addClass("seq-header");
            $th.addClass("top-header");
            $th.html(mTopSequence[idx]);
            $tr.append($th);
        }

        $table.append($tr);

        for (var i = 0; i < mSideSequence.length + 1; i++) {
            var isMax = (i==mIndexOfMaxValue[0]) ? true : false;
            constructNRowLocal(i, isMax);
        }

        $('#grid td').click(function() {
            var self = $(this);
            onCellClicked(
                self,
                self.attr('data-x'),
                self.attr('data-y')
            );
        });

        $('#grid td').hover(function() {
            if (mIsCustomPathMode) {
                return;
            }
            
            var self = $(this);
            var x = self.attr('data-x');
            var y = self.attr('data-y');
            
            if (x < 1 || y < 1) {
                return;
            }

            $("#side_seq_" + (y-1)).addClass('highlight');
            $("#top_seq_" + (x-1)).addClass('highlight');
            
            showTooltip(x, y);
        }, function() {
            $(".seq-header").removeClass('highlight');
            $('#grid td').removeClass('highlight');
            $('#grid td').removeClass('highlight-main');
            hideTooltip();
        });

        $('#grid th').hover(function() {
            var self = $(this);
            if(!self.hasClass("seq-header")){
                return;
            }
            
            var pos = self.offset();
            var topMargin = self.hasClass("side-header")?self.height()/4:self.height() + 4;
            var leftMargin = self.hasClass("side-header")?self.width() + 4:0;
            
            displayTooltip(text, pos.left + leftMargin, pos.top + topMargin );
        }, function() {
            hideTooltip();
        });
    }

    mSelf = {
        computeOptimal: function() {
            mIsCustomPathMode = false;
            var width = mTopSequence.length + 1;
            var height = mSideSequence.length + 1;

            var currentX = width - 1;
            var currentY = height - 1;
            while (currentX > -1 && currentY > -1) {

                var currentCell = mCellMap[currentX + '_' + currentY];
                var currentDom = $('#' + currentX + '_' + currentY);

                currentDom.click();
                
                var direction = null;
                if(currentCell.direction){
                    direction = currentCell.direction[currentCell.direction.length-1];
                }

                if(direction === null) {
                    if(currentX == 0) {
                        direction = 'u';
                    }
                    if(currentY == 0) {
                        direction = 's';
                    }
                }

                switch (direction) {
                    case 's':  currentX--;  break;
                    case 'u':  currentY--;  break;
                    default:
                    case 'd':
                        currentX--;
                        currentY--;
                        break;
                }
            }
        },

        rebuildTableGlobal: function(domContainer, resultContainer, matchScore, mismatchScore, gapScore, seqSide, seqTop) {
            if (isFirstLoad) {
                $(window).mousemove(function(e) {
                    window.mouseXPos = e.pageX;
                    window.mouseYPos = e.pageY;
                });
                isFirstLoad = false;
            }

            seqTop = seqTop.toUpperCase();
            seqSide = seqSide.toUpperCase();
            mCurrentPath = [];
            mDomContainer = domContainer;
            mDomResultContainer = resultContainer;
            mTopSequence = seqTop;
            mSideSequence = seqSide;
            mMatchScore = matchScore;
            mMismatchScore = mismatchScore;
            mGapScore = gapScore;

            var width = mTopSequence.length + 1;
            var height = mSideSequence.length + 1;

            for (var i = 0; i < width; i++) {
                mPathTable[i] = [];
                for (var j = 0; j < height; j++) {

                    if (i === 0 && j === 0) {
                        mPathTable[i][j] = 0;
                        mCellMap[i + "_" + j] = {
                            'winningScore': mPathTable[i][j]
                        };
                        continue;
                    }

                    if (i === 0) {
                        mPathTable[i][j] = j * gapScore;
                        mCellMap[i + "_" + j] = {
                            'winningScore': mPathTable[i][j]
                        };
                        continue;
                    }

                    if (j === 0) {
                        mPathTable[i][j] = i * gapScore;
                        mCellMap[i + "_" + j] = {
                            'winningScore': mPathTable[i][j]
                        };
                        continue;
                    }

                    var isMatch = mTopSequence[i - 1] === mSideSequence[j - 1];
                    var comparisonScore = isMatch ? matchScore : mismatchScore;
                    /*
                    console.log(
                        "Processing cell(" + i + ", " + j + ")\n" 
                        + "Side score is " + (mPathTable[i-1][j] + gapScore) + "\n"
                        + "Up score is " + (mPathTable[i][j-1] + gapScore) + "\n"
                        + "Diag score is " + (comparisonScore + mPathTable[i-1][j-1]) + "\n"
                    );
                    */
                    var moveUpScore = mPathTable[i][j - 1] + gapScore;
                    var moveSdScore = mPathTable[i - 1][j] + gapScore;
                    var moveDgScore = parseInt(comparisonScore, 10) + parseInt(mPathTable[i - 1][j - 1]);
                    mPathTable[i][j] = Math.max(moveUpScore, moveSdScore, moveDgScore);

                    /*
                    This is important when the values collide
                    That is, we have two ways that both have the same score
                    The PHP implemention does something that works which is
                    
                    It assigns the diagonal the lowest priority, then the up score and then the side scores
                    
                    */
                    
                    /*
                    var direction = 'd';
                    if (mPathTable[i][j] === moveUpScore) {
                        direction = 'u';
                    } else if (mPathTable[i][j] === moveSdScore) {
                        direction = 's';
                    }
                    */

                    var direction = [];

                    if(mPathTable[i][j] === moveDgScore){
                        direction.push('d');
                    }
                    
                    if (mPathTable[i][j] === moveUpScore) {
                        direction.push('u');
                    }
                    
                    if (mPathTable[i][j] === moveSdScore) {
                        direction.push('s');
                    }
                    
                    mCellMap[i + "_" + j] = {
                        'sideScoreText': mPathTable[i - 1][j] + " + " + gapScore + " (The Gap score) = " + moveSdScore,
                        'upScoreText': mPathTable[i][j - 1] + " + " + gapScore + " (The Gap score) = " + moveUpScore,
                        'diagonalScoreText': mPathTable[i - 1][j - 1]  + " + " +  
                            parseInt(comparisonScore, 10) +
                            " (Due to a " + (isMatch ? "match" : "mismatch") +
                            " between " + mTopSequence[i - 1] + " & " + mSideSequence[j - 1] + ") " +
                            " = " +
                            moveDgScore,
                        'sideScore': moveSdScore,
                        'upScore': moveUpScore,
                        'diagonalScore': moveDgScore,
                        'winningScore': mPathTable[i][j],
                        'direction': direction
                    };

                }
            }

            constructGridGlobal();
          
        },

        rebuildTableLocal: function(domContainer, resultContainer, matchScore, mismatchScore, gapScore, seqSide, seqTop) {
            if (isFirstLoad) {
                $(window).mousemove(function(e) {
                    window.mouseXPos = e.pageX;
                    window.mouseYPos = e.pageY;
                });
                isFirstLoad = false;
            }
            seqTop = seqTop.toUpperCase();
            seqSide = seqSide.toUpperCase();
            mCurrentPath = [];
            mDomContainer = domContainer;
            mDomResultContainer = resultContainer;
            mTopSequence = seqTop;
            mSideSequence = seqSide;
            mMatchScore = matchScore;
            mMismatchScore = mismatchScore;
            mGapScore = gapScore;
            mIndexOfMaxValue = [];
            maxValue = 0;
            mIsFindZero=false;

            var width = mTopSequence.length + 1;
            var height = mSideSequence.length + 1;

            for (var i = 0; i < width; i++) {
                mPathTable[i] = [];
                for (var j = 0; j < height; j++) {
                    if (i === 0 || j === 0) {
                        mPathTable[i][j] = 0;
                        mCellMap[i + "_" + j] = {
                            'winningScore': mPathTable[i][j]
                        };
                        continue;
                    }
                    

                    var isMatch = mTopSequence[i - 1] === mSideSequence[j - 1];
                    var comparisonScore = isMatch ? matchScore : mismatchScore;
                    
                    var moveUpScore = mPathTable[i][j - 1] + gapScore;
                    var moveSdScore = mPathTable[i - 1][j] + gapScore;
                    var moveDgScore = parseInt(comparisonScore, 10) + parseInt(mPathTable[i - 1][j - 1]);
                    mPathTable[i][j] = Math.max(moveUpScore, moveSdScore, moveDgScore, 0);

                    var direction = [];

                    if(mPathTable[i][j] === moveDgScore){
                        direction.push('d');
                    }
                    
                    if (mPathTable[i][j] === moveUpScore) {
                        direction.push('u');
                    }
                    
                    if (mPathTable[i][j] === moveSdScore) {
                        direction.push('s');
                    }

                    if(mPathTable[i][j] > maxValue){
                        maxValue = mPathTable[i][j];
                        mIndexOfMaxValue = [i,j];
                    }
                    
                    mCellMap[i + "_" + j] = {
                        'sideScoreText': mPathTable[i - 1][j] + " + " + gapScore + " (The Gap score) = " + moveSdScore,
                        'upScoreText': mPathTable[i][j - 1] + " + " + gapScore + " (The Gap score) = " + moveUpScore,
                        'diagonalScoreText': " Sim (" + mTopSequence[i - 1] + " & " + mSideSequence[j - 1] + ") = " + (isMatch ? "match " : "mismatch ") + 
                            "<br/> => " + mPathTable[i - 1][j - 1]  + " + " + parseInt(comparisonScore, 10) +
                            " = " + moveDgScore,
                        'sideScore': moveSdScore,
                        'upScore': moveUpScore,
                        'diagonalScore': moveDgScore,
                        'winningScore': mPathTable[i][j],
                        'direction': direction
                    };
                    //console.log(mCellMap[i + "_" + j]);
                }
            }
            constructGridLocal();
        }
    };

    return mSelf;
}());