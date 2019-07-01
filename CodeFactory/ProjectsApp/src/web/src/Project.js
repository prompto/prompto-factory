import React from 'react';
import { MenuItem, Col, Thumbnail, Clearfix } from 'react-bootstrap';
import LibraryPng from "./img/library.png";
import BatchJpg from "./img/batch.jpg";
import ScriptJpg from "./img/script.jpg";
import ServiceJpg from "./img/service.jpg";
import WebSiteJpg from "./img/website.jpg";
import WebLibraryJpg from "./img/weblibrary.jpg";

export const PROJECT_DEFAULT_IMAGES = {
    library : LibraryPng,
    script : ScriptJpg,
    website : WebSiteJpg,
    weblibrary : WebLibraryJpg,
    batch : BatchJpg,
    service : ServiceJpg,
};


export default class Project extends React.Component {

    constructor(props) {
        super(props);
        this.state = {contextMenu: false};
        this.handleClick = this.handleClick.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
    }

    render() {
        const module = this.props.module;
        const imageSrc = module.value.image || PROJECT_DEFAULT_IMAGES[module.type.toLowerCase()];
        const menuStyle = { position: "fixed", display: "block", left: this.state.menuLeft, top: this.state.menuTop, zIndex: 999999 };
        const description = module.value.description || "No description";
        const descClassName = "text-muted" + (description==="No description" ? " placeholder" : "");
        return <Col xs={4} sm={2} style={{width: "170px", boxSizing: "content-box" }} onContextMenu={this.handleContextMenu}>
            <Thumbnail src={imageSrc} onClick={this.handleClick}>
                <p><strong>{module.value.name}</strong></p>
                <p><span className="text-muted">{module.value.version.value}</span></p>
                <span className={descClassName}>{description}</span>
            </Thumbnail>
            {this.state.contextMenu && <Clearfix id="project-menu" style={menuStyle}>
                <ul className="dropdown-menu" style={{display: "block"}}>
                    <MenuItem href={"#"} onSelect={()=>this.props.root.exportProject(module)}>Export</MenuItem>
                    <MenuItem href={"#"} onSelect={()=>this.props.root.modifyProject(module)}>Modify</MenuItem>
                    <MenuItem href={"#"} onSelect={()=>this.props.root.deleteProject(module)}>Delete</MenuItem>
                    <MenuItem divider/>
                    <MenuItem href={"#"} onSelect={()=>alert("Under construction")}>New version...</MenuItem>
                    <MenuItem href={"#"} onSelect={()=>alert("Under construction")}>Freeze...</MenuItem>
                    <MenuItem href={"#"} onSelect={()=>alert("Under construction")}>Deploy...</MenuItem>
                </ul>
            </Clearfix>}
        </Col>;
    }

    handleClick() {
        const module = this.props.module;
        // TODO find why dbId.value stopped working
        const href = "../ide/index.html?dbId=" + (module.value.dbId.value || module.value.dbId) + "&name=" + module.value.name;
        const name = "Project:" + module.value.name;
        window["openWindowOrBringItToFront"](href, name);
    }

    handleContextMenu(e) {
        e.preventDefault();
        this.setState( { contextMenu: true, menuLeft: e.pageX,  menuTop: e.pageY } );
        document.addEventListener("click", this.handleDocumentClick );
        document.addEventListener("contextmenu", this.handleDocumentClick );
    }

    contains(elem, child) {
        while(child!=null) {
            if(child===elem)
                return true;
            child = child.parentElement;
        }
        return false;
    }

    handleDocumentClick(e) {
        const menu = document.getElementById("project-menu");
        const inside = this.contains(menu, e.target);
        // only bubble up useful clicks
        if(!inside || e.target.href==="#")
            e.stopPropagation();
        this.setState( { contextMenu: false } );
        document.removeEventListener("contextmenu", this.handleDocumentClick );
        document.removeEventListener("click", this.handleDocumentClick );
    }

}