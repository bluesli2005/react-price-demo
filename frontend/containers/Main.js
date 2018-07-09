import React, { Component } from 'react';
import Header from '../components/Header.js';
import SideBar from '../components/SideBar.js';
import Map from '../components/Map.js';
import PopChart from '../components/PopChart';

const districtList = [
  '和平',
  '河西',
  '南开',
  '河东',
  '河北',
  '红桥',
];

const num = [
  1499,
  965,
  2990,
  1347,
  1298,
  894,
];


export default class Main extends Component {
  constructor(props) {
    super(props);
    this.state = {
      zones: [],
      district: '',
      currentZone: null,
      chartVisibility: false,
    };
    this.onRefreshZones = this.onRefreshZones.bind(this);
    this.onClickZone = this.onClickZone.bind(this);
    this.setChartDisplay = this.setChartDisplay.bind(this);
    this.selectDistrict = this.selectDistrict.bind(this);
  }

  onRefreshZones(zones) {
    this.setState({
      zones,
    });
  }

  onClickZone(zone) {
    this.setState({
      currentZone: zone,
      chartVisibility: true,
    });
  }

  setChartDisplay(visibility) {
    this.setState({
      chartVisibility: visibility,
    });
  }

  selectDistrict(district) {
    this.setState({
      district,
    });
  }

  render() {
    return (
      <div>
        <Header districtList={districtList} onSearchDistrict={this.selectDistrict} />
        <SideBar zones={this.state.zones} onClickZone={this.onClickZone} />
        <Map
          data={this.state.district}
          districtList={districtList}
          num={num}
          onRefreshZones={this.onRefreshZones}
          onClickZone={this.onClickZone}
        />
        <PopChart
          data={this.state.currentZone}
          visibility={this.state.chartVisibility}
          setChartDisplay={this.setChartDisplay}
        />
      </div>
    );
  }
}
