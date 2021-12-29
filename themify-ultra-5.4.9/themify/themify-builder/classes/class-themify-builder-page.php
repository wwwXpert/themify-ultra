<?php

defined( 'ABSPATH' ) || exit;

class Themify_Builder_Builder_Page {

	static function init() {
		if ( ! current_user_can( 'publish_pages' ) ) {
			return;
		}

		add_action( 'admin_bar_menu', [ __CLASS__, 'admin_bar_menu' ], 999 );
		if ( is_admin() ) {
			add_action( 'admin_menu', [ __CLASS__, 'admin_menu' ] );
			add_filter( 'admin_footer', [ __CLASS__, 'loader_script' ] );
			add_filter( 'wp_ajax_tb_builder_page', [ __CLASS__, 'wp_ajax_tb_builder_page' ] );
			add_filter( 'wp_ajax_tb_builder_page_publish', [ __CLASS__, 'wp_ajax_tb_builder_page_publish' ] );
		} else {
			add_filter( 'wp_footer', [ __CLASS__, 'loader_script' ] );
		}
	}

	static function admin_menu() {
		add_submenu_page( 'edit.php?post_type=page', __( ' Add Builder Page', 'themify' ), __( ' Add Builder Page', 'themify' ), 'publish_pages', '#tb_builder_page', null );
	}

	static function admin_bar_menu( $admin_bar ) {
		$args = array(
			'parent' => 'new-page',
			'id'     => 'tb_builder_page',
			'title'  => __( ' Builder Page', 'themify' ), /* space before the title is for the tf_loader element */
			'href'   => '#tb_builder_page',
			'meta'   => false
		);
		$admin_bar->add_node( $args );       
	}

	static function wp_ajax_tb_builder_page() {
		check_ajax_referer( 'tb_load_nonce' );
		include THEMIFY_BUILDER_INCLUDES_DIR . '/themify-builder-page.php';
	    die;
	}

	/**
	 * Publish a new page and import a chosen Builder layout
	 *
	 * @hooked to wp_ajax_tb_builder_page_publish
	 */
	static function wp_ajax_tb_builder_page_publish() {
		check_ajax_referer( 'tb_load_nonce' );
		$title = isset( $_POST['title'] ) ? sanitize_text_field( $_POST['title'] ) : '';
		$layout = isset( $_POST['layout'] ) ? $_POST['layout'] : '';
		$parent = isset( $_POST['parent'] ) ? (int) $_POST['parent'] : 0;
		$new_page = wp_insert_post( [
			'post_type' => 'page',
			'post_status' => 'publish',
			'post_title' => $title,
			'post_parent' => $parent,
		] );
		if ( is_wp_error( $new_page ) ) {
			wp_send_json_error( $new_page );
		}
		if ( ! empty( $layout ) ) {
			ThemifyBuilder_Data_Manager::save_data( $layout, $new_page );
		}
		if ( themify_is_themify_theme() ) {
			update_post_meta( $new_page, 'content_width', 'full_width' );
			update_post_meta( $new_page, 'page_layout', 'sidebar-none' );
			update_post_meta( $new_page, 'hide_page_title', 'yes' );
		}
		$url = themify_https_esc( get_permalink( $new_page ) ) . '#builder_active';
		wp_send_json_success( $url );
	}

	/**
	 * Adds necessary script & style for loading the modal box
	 *
	 * @return void
	 */
	static function loader_script() {
		$paths = Themify_Builder::get_paths();
		$data = [
			'nonce' => wp_create_nonce( 'tb_load_nonce' ),
			'ajaxurl' => admin_url( 'admin-ajax.php' ),
			'css' => [
				'tf-base' => themify_enque( THEMIFY_URI . '/css/base.min.css' ),
				'builder-page' => themify_enque( THEMIFY_BUILDER_URI . '/css/editor/builder-page.css' ),
			],
			'paths' => $paths,
		];
		?>
		<script>
			tbBuilderPage = JSON.parse( '<?php echo json_encode( $data ); ?>' );
			window.addEventListener( 'DOMContentLoaded', () => {
				let links = document.querySelectorAll( 'a[href="#tb_builder_page"]' ),
					spinner = document.createElement( 'div' );
				spinner.style.display = 'none';
				spinner.classList.add( 'tbbp_spinner' );
				document.body.appendChild( spinner );
				for ( let i = 0; i < links.length; i++ ) {
					links[ i ].addEventListener( 'click', () => {
						if ( window.ThemifyBuilderPage ) {
							ThemifyBuilderPage.showPanel();
						} else {
							spinner.style.display = 'block';
							let script = document.createElement( 'script' );
							script.onload = function() {
								ThemifyBuilderPage.spinner = spinner;
								ThemifyBuilderPage.run();
							}
							script.src = '<?php echo themify_enque( THEMIFY_BUILDER_URI . "/js/editor/themify-builder-page.js" ); ?>';
							Themify.body[0].appendChild( script );
						}
					} );
				}
			}, { passive: true } );
		</script>
		<style>.tbbp_spinner{margin:-20px 0 0 -20px;width:62px;height:62px;background-color:rgba(0,0,0,.6);border-radius:50%;box-sizing:border-box;position:fixed;top:50%;left:50%;z-index:100001;line-height:62px}.tbbp_spinner:before{width:80%;height:80%;border:5px solid transparent;border-top-color:#fff;border-radius:50%;box-sizing:border-box;position:absolute;top:10%;left:10%;content:'';animation:circle-loader 1.4s infinite linear}@keyframes circle-loader{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}</style>
		<?php
	}
}