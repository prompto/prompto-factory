import React from 'react';
import { Navbar, Nav, NavDropdown, MenuItem, Button } from 'react-bootstrap';

const btnStyle = {backgroundImage: "none"};

export default class ProjectsNavBar extends React.Component {

    render() {
        return <Navbar inverse fluid fixedTop>
            <Navbar.Header>
                <Navbar.Brand pullLeft>
                    <a href="/">Prompto Project Explorer</a>
                </Navbar.Brand>
            </Navbar.Header>
            <Nav pullRight>
                <NavDropdown title="Tools">
                    <MenuItem href="/data/index.html" target="DataExplorer">Data explorer</MenuItem>
                    <MenuItem href="/store/index.page" target="StoreExplorer">Store explorer</MenuItem>
                </NavDropdown>
                <NavDropdown title="Help">
                    <MenuItem href="http://www.prompto.org/?section=tutorials" target="PromptoTutorials">Tutorials</MenuItem>
                    <MenuItem href="http://www.prompto.org/?section=libraries" target="PromptoReference">Reference</MenuItem>
                </NavDropdown>
            </Nav>
            <Navbar.Form pullRight>
                <Button type="button" id="btnNewProject" onClick={this.props.root.newProject} style={btnStyle}>New</Button>
                &nbsp;
                <Button type="button" onClick={this.props.root.importProject} style={btnStyle}>Import</Button>
            </Navbar.Form>
        </Navbar>;
    }

}

