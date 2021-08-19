import { config, simDB} from "../interact.js";
import { isInt, wrap_fast } from "../core/util.js";
import { WaveTable } from "./WaveTable.js";

/* index definitions for render data */
const WAVEARRAY = 0;
const IDX = 1;

export class Wave {
  constructor(waveTable) {

    /** @type {WaveTable} */
    this.waveTable = waveTable;

    /** @type {string} */
    this.rowIdPrefix = '#signalRow_';
    this.rowClass = '.signalRow';

    this.zoom = d3.zoom();
    this.x_grid = d3.axisBottom();
    this.x_axis = d3.axisBottom();

    this.initialTimeScale = d3.scaleLinear();
    this.timeScale = d3.scaleLinear();
    this.renderTimeScale = d3.scaleLinear();
    this.bitWaveScale = d3.scaleLinear();

    this.renderRange = [];
    this.renderDomain = [];

    /* Debug variables */
    this.dbg_enableUpdateRenderRange = true;
    this.dbg_enableRender = true;

    this.save_time= 0;
  }

  init() {
    this.renderRange = [0, simDB.now];
    this.renderDomain = [0, simDB.now];

    this.renderTimeScale
      .domain(this.renderDomain)
      .range(this.renderRange);
    this.initialTimeScale
      .domain([0, simDB.now])
      .range([0, simDB.now]);
    this.timeScale
      .domain([0, simDB.now])
      .range([0, simDB.now]);
    this.bitWaveScale
      .domain([0, 1])
      .range([config.rowHeight - config.bitWavePadding, config.bitWavePadding]);

    // zoom
    d3.select("#wave-axis-container")
      .on('scroll', this.scrolled.bind(this))
      .call(this.zoom)
      .on("wheel", () => {
        if (d3.event.ctrlKey)
          d3.event.preventDefault()
      })

    this.zoom
      .scaleExtent([200 / this.timeScale(simDB.now), 20])
      .on("zoom", this.zoom_fast.bind(this)).filter(
        // Use Ctrl+Wheel, with mouse to zoom (simple wheel will scrolls up/down)
        // Or use touch gesture on touch devices
        () => d3.event.ctrlKey | d3.event.type.startsWith("touch"))
      .on("end", this.zoom_end.bind(this));
      
    const mainGr = d3.select('#mainGr');

    mainGr.append('g')
    .attr('id', 'grid-gr');
  
    mainGr.append('g')
      .attr('id', 'signals-table');

    mainGr.append('g')
      .attr('id', 'time-axis-gr-container')

    mainGr.append('g')
      .attr('id', 'cursorGr');

      mainGr.append('g')
      .attr('id', 'cursorGr1');      
  }

  reload(render=false) {
    
    d3.select('#mainGr').selectAll("g").selectAll("*").remove();
    
    const time_axis_gr_container = d3.select('#time-axis-gr-container');

    time_axis_gr_container.append('rect')
      .attr('class', 'time-grid-shadow-rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.initialTimeScale(simDB.now))
      .attr('height', 20);
      
    time_axis_gr_container.append('g')
      .attr('id', 'time-axis-gr');

    const rowsToPlot = this.waveTable.getRows({hidden:false, content:true});

    d3.select('#mainSVG')
      .attr('width', simDB.now + 200)
      .attr('height', config.rowHeight * (rowsToPlot.length + 1));

    const signalsTable = d3.select('#signals-table');

    const signalRow = signalsTable.selectAll('.signalRow')
      .data(rowsToPlot)
      .enter()
      .append('g')
      .attr('transform', (d, i) => `translate(0, ${i * config.rowHeight})`)
      .attr('id', d => `signalRow_${d.id}`)
      .attr('class', d => `signalRow ${d.id}`);

    const timeScaleGroup = signalRow.append('g')
      .attr('class', 'time-scale-group');


    /*
     * Axis
     */
    timeScaleGroup
      .append('g')
      .attr('id', d => `signalWave_${d.id}`)
      .attr('class', () => `signalWave`);

    signalRow
      .append('g')
      .attr('class', 'signalValues');

    timeScaleGroup
      .append('g')
      .attr('class', 'signal-highlighter-group')
      .append('rect')
      .attr('class', 'signal-highlighter signal-context-menu')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.initialTimeScale(simDB.now))
      .attr('height', config.rowHeight);

    /*
     * Cursor
     */

    d3.select('#cursorGr').append('line')
      .classed('cursor', true)
      .attr('id', 'main-cursor')
      .attr('vector-effect', 'non-scaling-stroke')
      .attr('y1', 0)
      .attr('y2', config.rowHeight * rowsToPlot.length);

    d3.select('#cursorGr1').append('line')
      .classed('cursor', true)
      .attr('id', 'main-cursor1')
      .attr('vector-effect', 'non-scaling-stroke')
      .attr('y1', 0)
      .attr('y2', config.rowHeight * rowsToPlot.length);      
    
    const self = this;
    d3.select('#mainGr').on("click", function () {
      const click_time = self.timeScale.invert(d3.mouse(this)[0]);
      self.waveTable.moveCursorTo(self.waveTable.cursor_num, click_time);
      self.save_time = click_time;      
    });

    if(render){
      this.zoom.scaleBy(d3.select("#wave-axis-container"), 1.0);
    }
  }

  refresh() {
  }

  clearAll() {
  }

  selectRow(rowId, select=true) {
    d3.selectAll(`${this.rowClass}.${rowId}`).classed('highlighted-signal', select);
  }

  deSelectRow(rowId) {
    this.selectRow(rowId, false)
  }

  moveRow(rowId, pos) {
    this.reOrderSignals();
  }
    
  /**
   * Re-order the signals in the waveform.
   *
   * Updates the signals' order in both names-col-container-scroll, values-col and mainGr
   * 
   * @param {Object} signals contains the signals in the *wanted* order
   */
  reOrderSignals() {
    d3.select('#mainSVG').selectAll('.signalRow')
      .data(this.waveTable.getRows({hidden:false, content:true}), d=>d.id)
      .order()
      .attr('transform', (d, i) => {
        return `translate(0, ${i * config.rowHeight})`
      });
  }

  openGroup(rowId) {
    this.insertRow();
  }

  closeGroup(rowId) {
    this.removeRow();
  }

  insertRow(rowId, parent, pos) {
    const signalsTable = d3.select('#signals-table');
    const rowsToPlot = this.waveTable.getRows({hidden:false, content:true});

    const signalRow = signalsTable.selectAll('.signalRow')
      .data(rowsToPlot, row => row.id)
      .enter()
      .append('g')
      .attr('id', d => `signalRow_${d.id}`)
      .attr('class', d => `signalRow ${d.id}`);

    const timeScaleGroup = signalRow.append('g')
      .attr('class', 'time-scale-group');

    this.reOrderSignals();
  }

  removeRow(rowId) {
    d3.selectAll('.signalRow').filter(
      d => !(this.waveTable.getRows({hidden:false, content:true}).includes(d))
    ).remove();
    this.reOrderSignals()
  }

  getSelectedRows() {
  }

  getActiveRow() {
  }

  rename(rowId, name) {
  }

  setRadix(rowId){
    // this.reload(true)
  }

  /******************************************************************************
   * 
   * EXPORTED API FUNCTIONS
   * 
   ******************************************************************************/

  /**
   * Zoom fit: show whole data in the screen. Now will be at the right edge of the window.
   */
  zoomFit() {
    var width = $("#wave-axis-container").width();
    var scale = (width - 202) / simDB.now;

    var autozoom = d3.zoomIdentity;
    autozoom.k = scale;

    d3.select("#wave-axis-container")
      .call(this.zoom.transform, autozoom);
  }

  /**
   * Zoom in: show more details
   */
  zoomIn() {
    this.zoom.scaleBy(d3.select("#wave-axis-container"), 1.3);
  }

  /**
   * Zoom out: show more overview-ed view
   */
  zoomOut() {
    this.zoom.scaleBy(d3.select("#wave-axis-container"), 1 / 1.3);
  }

  /**
   * Autoscale: scale to show enough detail for humans
   */
  zoomAutoscale() {
    var rows = this.waveTable.getRows({hidden:false, content:true});

    if (rows.length > 0) {
      // Average wave change times
      var avgDelta = rows.reduce((acc, row) => {
        const signal = row.simObj.signal;
        if (signal.wave.length) {
          return acc + simDB.now / signal.wave.length
        } else {
          return 1;
        }
      }, 0) / rows.length;

      // The average change should be ~20px;
      var scale = 500 / avgDelta;

      var autozoom = d3.zoomIdentity;
      autozoom.k = scale;

      console.log(`avgDelta: ${avgDelta}`);
      console.log(`scale: ${scale}`);
      console.log(autozoom);

      d3.select("#wave-axis-container")
        .call(this.zoom.transform, autozoom);
    }
  }

  /**
   * Updates the render-range.
   * 
   * The render range contains the time/pixel range which must be rendered. (which are visible)
   */
  updateRenderRange() {
    if (this.dbg_enableUpdateRenderRange) {
      const wrapper = d3.select('#wave-axis-container');

      const visibleWidth = wrapper.node().getBoundingClientRect().width,
        visibleLeft = wrapper.node().scrollLeft,
        visibleRight = visibleLeft + visibleWidth;

      this.renderRange = [visibleLeft - 200, visibleRight + 200];
      this.renderDomain = [this.timeScale.invert(this.renderRange[0]), this.timeScale.invert(this.renderRange[1])];
      this.renderTimeScale
        .range(this.renderRange)
        .domain(this.renderDomain);
      console.log(this.renderRange)
      console.log(this.renderDomain)
    }
  }

  /**
   * Update the axis
   */
  updateAxis() {
    const rangeWidth = this.renderTimeScale.range()[1] - this.renderTimeScale.range()[0];

    var bottom = $('#main-container-scroll-y').innerHeight()+$('#main-container-scroll-y').scrollTop();

    bottom = Math.min($('#wave-axis-container')[0].clientHeight, bottom);

    d3.select('#grid-gr')
      .attr('transform', `translate(0, ${bottom-20})`);
    
    d3.select('#time-axis-gr-container')
      .attr('transform', () => `translate(0, ${bottom-20})`);

    this.x_grid
      .tickSize(-$('#mainSVG').height())
      .tickFormat("");

    this.x_axis
      .scale(this.renderTimeScale)
      .ticks(rangeWidth / 150);
    d3.select('#time-axis-gr').call(this.x_axis);

    this.x_grid.scale(this.renderTimeScale)
      .ticks(rangeWidth / 300);
    d3.select('#grid-gr').call(this.x_grid);

  }

  /******************************************************************************
   * 
   * D3 CALLBACK FUNCTIONS
   * 
   ******************************************************************************/

  /**
   * Zoom end called after the d3 zoom event.
   * 
   * `end` event is emitted when no wheel events are received for 150ms.
   * This function do an exact render.
   */
  zoom_end() {
    console.log(d3.event);
    this.drawWave2();
  }

  /**
   * Called by the d3 zoom at all zoom event.
   * 
   * zoom_fast do sort and fast transformation. The exact re-render is done by the zoom_end at the
   * end of the zoom.
   */
  zoom_fast() {
    console.log(d3.event);

    const wrapper = d3.select('#wave-axis-container');
    this.timeScale.range([0, simDB.now * d3.event.transform.k]);

    d3.select('#mainSVG')
      .attr('width', d3.event.transform.k * (simDB.now) + 200);

    // Move scrollbars.
    wrapper.node().scrollLeft = -d3.event.transform.x;

    this.updateRenderRange();

    // Fast Zoom:
    d3.selectAll('.time-scale-group')
      .attr('transform', 'scale(' + d3.event.transform.k + ',1)');

    this.updateAxis();

    d3.selectAll('#cursorGr')
      .attr('transform', 'scale(' + d3.event.transform.k + ',1)');

      d3.selectAll('#cursorGr1')
      .attr('transform', 'scale(' + d3.event.transform.k + ',1)');

    d3.selectAll('.bus-value')
      .attr('x', d => this.timeScale(d[WAVEARRAY].getTimeAtI(d[IDX]) + d[WAVEARRAY].getTimeAtI(d[IDX] + 1)) / 2)

  }

  /**
   * Called by d3, when the waveform is scrolled left/right (aka. in time).
   */
  scrolled() {
    const wrapper = d3.select('#wave-axis-container');
    d3.zoomTransform(wrapper.node()).x = -wrapper.node().scrollLeft;

    this.updateRenderRange();
    this.updateAxis();
  }

  moveCursorTo(cursor_num, simTime) {
    var cursor;
    
    if(cursor_num == 0){
      cursor = d3.select('#cursorGr').select('#main-cursor');
    }else if(cursor_num == 1){
      cursor = d3.select('#cursorGr1').select('#main-cursor1');
    }else{
      console.error("Could not get cursor number.");
    }

    if (simTime >= 0) {
      cursor.datum(simTime)
    }

    cursor
      .attr('x1', d => d)
      .attr('x2', d => d);
  }

  getCursorTime(cursor_num) {
    // if(cursor_num == 0){
      var t = d3.select('#main-cursor').datum();
    // }
    // else if(cursor_num == 1){
    //   var t = d3.select('#main-cursor1').datum();
    // }
    console.log(t);
    return t;
  }

  /**
   * Renred all singals in the waveform
   */
  drawWave2() {
    const self = this;
    if (this.dbg_enableRender) {
      d3.selectAll('.signalRow')
        .each(function () {
          self.drawWave(d3.select(this));
        });
    }
  }

  /**
   * Render the given signal
   * 
   * @param {d3 Object} signalWaveSVG is the d3 object to be render
   */
  drawWave(timeScaleGroup) {

    const signalWaveSVG = timeScaleGroup.select('.signalWave')
    const signalValuesSVG = timeScaleGroup.select('.signalValues')
    const rowData = signalWaveSVG.datum();

    function parseIntDef(intToPare, def = 0.5) {
      if (isInt(intToPare)) {
        return parseInt(intToPare);
      } else {
        return def;
      }
    }

    function value2Color(val) {
      if (isInt(val))
        return "#00FF00";
      else if (val == 'z')
        return "#0000FF";
      else
        return "#FF0000";
    }

    var waveChangesIndex = rowData.simObj.signal.wave.reduce((res, current, i) => {
      if (this.waveIInRenderRange(rowData.simObj.signal, i)) {
        res.push([rowData, i]);
      }
      return res;
    }, []);

    // console.log(waveChangesIndex);
    signalWaveSVG.classed(`wave-style-${rowData.waveStyle}`, true);

    if (rowData.waveStyle == 'bit') {

      // horizontal aka. timeholder:
      var timeholders = signalWaveSVG.selectAll('.timeholder')
        .data(waveChangesIndex, d=> d[IDX]);

      timeholders.exit().remove();

      timeholders = timeholders.enter()
        .append('line')
        .classed('timeholder', true);

      // vertical aka. valuechanger
      var valuechanger = signalWaveSVG.selectAll('.valuechanger')
        .data(waveChangesIndex.slice(1), d=> d[IDX]);

      valuechanger.exit().remove();

      valuechanger = valuechanger.enter()
        .append('line')
        .classed('valuechanger', true);

      // transparent rect
      var transRect = signalWaveSVG.selectAll('.transparent-rect')
        .data(waveChangesIndex, d=> d[IDX]);

      transRect.exit().remove();

      transRect = transRect.enter()
        .append('rect')
        .classed('transparent-rect', true);

      transRect
        .attr('x', d => this.initialTimeScale(d[WAVEARRAY].getTimeAtI(d[IDX])))
        .attr('y', d => this.bitWaveScale(parseIntDef(d[WAVEARRAY].getValueAtI(d[IDX]))))
        .attr('width', d => this.initialTimeScale((d[WAVEARRAY].getTimeAtI(d[IDX] + 1)) - d[WAVEARRAY].getTimeAtI(d[IDX])))
        .attr('height', d => this.bitWaveScale(1 - parseIntDef(d[WAVEARRAY].getValueAtI(d[IDX]))) - 2)
        .style("fill", d => value2Color(d[WAVEARRAY].getValueAtI(d[IDX])));

      timeholders
        .attr('x1', d => this.initialTimeScale(d[WAVEARRAY].getTimeAtI(d[IDX])))
        .attr('y1', d => this.bitWaveScale(parseIntDef(d[WAVEARRAY].getValueAtI(d[IDX]))))
        .attr('x2', d => this.initialTimeScale(d[WAVEARRAY].getTimeAtI(d[IDX] + 1)))
        .attr('y2', d => this.bitWaveScale(parseIntDef(d[WAVEARRAY].getValueAtI(d[IDX]))))
        .style("stroke", d => value2Color(d[WAVEARRAY].getValueAtI(d[IDX])))
        .attr('vector-effect', 'non-scaling-stroke');

      valuechanger
        .attr('x1', d => this.initialTimeScale(d[WAVEARRAY].getTimeAtI(d[IDX])))
        .attr('y1', d => this.bitWaveScale(parseIntDef(d[WAVEARRAY].getValueAtI([d[IDX] - 1]))))
        .attr('x2', d => this.initialTimeScale(d[WAVEARRAY].getTimeAtI(d[IDX])))
        .attr('y2', d => this.bitWaveScale(parseIntDef(d[WAVEARRAY].getValueAtI(d[IDX]))))
        .style("stroke", d => value2Color(d[WAVEARRAY].getValueAtI(d[IDX])))
        .attr('vector-effect', 'non-scaling-stroke');

    } else if (rowData.waveStyle == 'bus') {
      var busPath = signalWaveSVG.selectAll('path')
        .data(waveChangesIndex, d=> d[IDX]);

      // signalValuesSVG.selectAll('.bus-value-group').remove();
      var busValue = signalValuesSVG.selectAll('.bus-value-group')
        .data(waveChangesIndex, d=> d[IDX]);

      busPath.exit().remove();
      busValue.exit().remove();

      busPath = busPath.enter()
        .append('path')
        .classed('bus-path', true);
      busValue = busValue.enter()
        .append('g')
        .classed('bus-value-group', true)
        .append('text')
        .classed('bus-value', true);

      busPath
        .attr('vector-effect', 'non-scaling-stroke')
        .style("stroke", d => value2Color(d[WAVEARRAY].getValueAtI(d[IDX])))
        .style("fill", d => value2Color(d[WAVEARRAY].getValueAtI(d[IDX])))
        .style("stroke-width", "2")
      
      signalWaveSVG.selectAll('.bus-path')
        .attr('d', d => {
          var ret = '';
          ret += `M${(d[WAVEARRAY].getTimeAtI(d[IDX] + 1)) - (this.timeScale.invert(2))},${this.bitWaveScale(1)} `
          ret += `${(d[WAVEARRAY].getTimeAtI(d[IDX])) + (this.timeScale.invert(2))},${this.bitWaveScale(1)} `
          ret += `${(d[WAVEARRAY].getTimeAtI(d[IDX]))},${this.bitWaveScale(0.5)} `
          ret += `${(d[WAVEARRAY].getTimeAtI(d[IDX])) + (this.timeScale.invert(2))},${this.bitWaveScale(0)} `
          ret += `${(d[WAVEARRAY].getTimeAtI(d[IDX] + 1)) - (this.timeScale.invert(2))},${this.bitWaveScale(0)} `
          if (d[WAVEARRAY].getTimeAtI(d[IDX] + 1) < simDB.now) {
            ret += `${d[WAVEARRAY].getTimeAtI(d[IDX] + 1)},${this.bitWaveScale(0.5)} `
            ret += `${d[WAVEARRAY].getTimeAtI(d[IDX] + 1) - (this.timeScale.invert(2))},${this.bitWaveScale(1)} `
          }
          return ret;
        });

      const self = this;
      busValue
        .text(d => d[WAVEARRAY].getValueAtI(d[IDX]))
        .attr("y", config.rowHeight / 2)
        .attr('x', d => this.timeScale(d[WAVEARRAY].getTimeAtI(d[IDX]) + d[WAVEARRAY].getTimeAtI(d[IDX] + 1)) / 2)
        .each(function (d) {
          wrap_fast(this, self.timeScale(d[WAVEARRAY].getTimeAtI(d[IDX] + 1) - d[WAVEARRAY].getTimeAtI(d[IDX])));
        });

    } else {

      signalWaveSVG
        .append('rect')
        .attr('height', config.rowHeight)
        .attr('width', simDB.now)
        .attr('fill', 'rgba(180, 0, 0, 0.5)');
      signalWaveSVG.append('text')
        .text(`Unsupported waveStyle: ${rowData.waveStyle}`)
        .attr("y", config.rowHeight / 2)
        .attr("x", 10)
        .attr('text-anchor', 'left')
        .attr('alignment-baseline', 'middle');
      return;
    }
  }

  /**
   * Filter value change elements, pass which are inside the rendering region.
   *
   * @param {Signal} signal a wave change element, to filter
   * @return {boolean} true if the waveChange element inside the rendering region.
   */
  waveIInRenderRange(signal, i){
    var t0 = signal.getTimeAtI(i),
      t1 = signal.getTimeAtI(i+1),
      domainMin = d3.min(this.renderTimeScale.domain()),
      domainMax = d3.max(this.renderTimeScale.domain());
  
    return t0 <= domainMax && t1 >= domainMin;
  }


  dbg_setEnableUpdateRenderRange(val) {
    this.dbg_enableUpdateRenderRange = val;
  }

  dbg_setEnableRender(val) {
    this.dbg_enableRender = val;
  }

}
