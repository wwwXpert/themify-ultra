<?php

class Themify_Hooks {

	/**
	 * Multi-dimensional array of hooks in a theme
	 */
	private $hook_locations;

	/**
	 * list of hooks, visible to the current page context
	 */
	private $action_map;
	public $pre = 'setting-hooks';
	public $data;

	public function __construct() {
		if ( is_admin() ) {
			add_filter( 'themify_theme_config_setup', array( $this, 'config_setup' ), 12 );
			add_action( 'wp_ajax_themify_hooks_add_item', array( $this, 'ajax_add_button' ));
			add_action( 'wp_ajax_themify_get_visibility_options', array( $this, 'ajax_get_visibility_options' ) );
			add_action( 'wp_ajax_themify_create_inner_page', array( $this, 'ajax_create_inner_page' ) );
			add_action( 'wp_ajax_themify_create_page_pagination', array( $this, 'ajax_create_page_pagination' ) );
			add_action( 'admin_footer', array( $this, 'visibility_dialog' ) );
			add_filter( 'themify_hooks_visibility_post_types', array( $this, 'exclude_attachments_from_visibility' ) );
		} else {
			add_action( 'template_redirect', array( $this, 'hook_locations_view_setup' ), 9 );
			add_action( 'template_redirect', array( $this, 'hooks_setup' ) );
			add_filter( 'themify_hooks_item_content', array($this,'themify_do_shortcode_wp') );
		}
		add_action( 'init', array( $this, 'register_default_hook_locations' ) );
	}

	function hooks_setup() {
		$this->data = themify_get_data();
		if ( isset( $this->data["{$this->pre}_field_ids"] ) ) {
			$ids = json_decode( $this->data["{$this->pre}_field_ids"] );
			if ( ! empty( $ids ) ) : foreach ( $ids as $id ) :
					if ( $this->check_visibility( $id ) ) {
						$location = $this->data["{$this->pre}-{$id}-location"];
						/* cache the ID of the item we have to display, so we don't have to re-run the conditional tags */
						$this->action_map[$location][] = $id;
						add_action( $location, array( $this, 'output_item' ) );
					}
				endforeach;
			endif;
		}
	}

	/**
	 * Check if an item is visible for the current context
	 *
	 * @param int $id
	 *
	 * @return bool
	 */
	public function check_visibility( $id ) {
		$visible = true;
		if ( ! isset( $this->data["{$this->pre}-{$id}-visibility"] ) )
			return $visible;

		$logic = $this->data["{$this->pre}-{$id}-visibility"];
		parse_str( $logic, $logic );
		$query_object = get_queried_object();

		// Logged-in check
		if ( isset( $logic['general']['logged'] ) ) {
			if( ! is_user_logged_in() ) {
				return false;
			}
			unset( $logic['general']['logged'] );
			if( empty( $logic['general'] ) ) {
				unset( $logic['general'] );
			}
		}

		// User role check
		if ( ! empty( $logic['roles'] )
			// check if *any* of user's role(s) matches
			&& ! count( array_intersect( wp_get_current_user()->roles, array_keys( $logic['roles'], true ) ) )
		) {
			return false; // bail early.
		}
		unset( $logic['roles'] );

		if ( ! empty( $logic ) ) {
                        $post_type = get_post_type();
			$visible = false; // if any condition is set for a hook, hide it on all pages of the site except for the chosen ones.

			if (
				( isset($logic['general']['home']) && is_front_page())
				|| ( isset( $logic['general']['page'] ) &&  is_page() && ! is_front_page() && ! themify_is_custom_404() )
				|| ( isset($logic['general']['single']) && is_single() && $post_type === 'post' )
				|| ( isset($logic['general']['search']) && is_search() )
				|| ( isset($logic['general']['author']) && is_author())
				|| ( isset($logic['general']['category']) && is_category() )
				|| ( isset($logic['general']['tag'])  && is_tag())
				|| ( isset($logic['general']['date']) && is_date() )
				|| ( isset($logic['general']['year']) && is_year())
				|| ( isset($logic['general']['month']) && is_month())
				|| ( isset($logic['general']['day']) && is_day())
				|| (isset($query_object) && (( $post_type !== 'page' && $post_type !== 'post' && isset($logic['general'][$post_type]) && is_singular()  )
				|| ( $query_object->name !== 'page' && $query_object->name !== 'post' && isset( $logic['post_type_archive'][$query_object->name] ) && is_post_type_archive()  )
				|| ( is_tax() && isset($logic['general'][$query_object->taxonomy]))))
			) {
				$visible = true;
			} else { // let's dig deeper into more specific visibility rules
				if ( ! empty( $logic['tax'] ) ) {
					if ( is_singular() ) {
						if( !empty($logic['tax']['category_single'])){
							// Backward compatibility
							reset($logic['tax']['category_single']);
							$first_key = key($logic['tax']['category_single']);
							if(!is_array($logic['tax']['category_single'][$first_key])){
								$logic['tax']['category_single'] = array('category'=> $logic['tax']['category_single']);
							}
							if ( empty( $logic['tax']['category_single']['category'] ) ) {
								$cat = get_the_category();
								if(!empty($cat)){
									foreach($cat as $c){
										if($c->taxonomy === 'category' && isset($logic['tax']['category_single']['category'][$c->slug])){
											return true;
										}
									}
								}
								unset($logic['tax']['category_single']['category']);
							}
							foreach ($logic['tax']['category_single'] as $key => $tax) {
								$terms = get_the_terms( get_the_ID(), $key);
								if ( $terms !== false && !is_wp_error($terms) && is_array($terms) ) {
									foreach ( $terms as $term ) {
										if( isset($logic['tax']['category_single'][$key][$term->slug]) ){
											return true;
										}
									}
								}
							}
						}
					} else {
						foreach ( $logic['tax'] as $tax => $terms ) {
							$terms = array_keys( $terms );
							if ( ( $tax === 'category' && is_category($terms) ) || ( $tax === 'post_tag' && is_tag( $terms ) ) || ( is_tax( $tax, $terms ) )
							) {
								$visible = true;
								break;
							}
						}
					}
				}
				if ($visible===false && ! empty( $logic['post_type'] ) ) {
					foreach ( $logic['post_type'] as $post_type => $posts ) {
						$posts = array_keys( $posts );
						if (
							// Post single
							( $post_type === 'post' && is_single( $posts ) )
							// Page view
							|| ( $post_type === 'page' && (
									(
									( ( isset( $query_object->post_parent ) && $query_object->post_parent <= 0 && is_page( $posts ) )
										// check for pages that have a Parent, the slug for these pages are stored differently.
										|| ( isset( $query_object->post_parent ) && $query_object->post_parent > 0 &&
											( in_array( '/' . str_replace( strtok( get_home_url(), '?'), '', remove_query_arg( 'lang', get_permalink( $query_object->ID ) ) ), $posts ) ||
												in_array( str_replace( strtok( get_home_url(), '?'), '', remove_query_arg( 'lang', get_permalink( $query_object->ID ) ) ), $posts ) ||
												in_array( '/'.$this->child_post_name($query_object).'/', $posts ) )
										)
									) )
									|| ( ! is_front_page() && is_home() && in_array( get_post_field( 'post_name', get_option( 'page_for_posts' ) ), $posts,true ) ) // check for Posts page
									|| ( themify_is_shop() && in_array( get_post_field( 'post_name', themify_shop_pageId() ), $posts,true )  ) // check for WC Shop page
								) )
							// Custom Post Types single view check
							|| ( isset( $query_object->post_parent ) && $query_object->post_parent <= 0 && is_singular( $post_type ) && in_array( $query_object->post_name, $posts,true ) )
							|| ( isset( $query_object->post_parent ) && $query_object->post_parent > 0 && is_singular( $post_type ) && in_array( '/'.$this->child_post_name($query_object).'/', $posts,true ) )
							// for all posts of a post type.
							|| ( is_singular( $post_type ) && in_array( 'E_ALL', $posts,true ) )
						) {
							$visible = true;
							break;
						}
					}
				}
				if($visible===false &&  themify_is_shop() && ( $shop_page_slug = get_post_field( 'post_name', themify_shop_pageId() ) ) && isset( $logic['post_type']['page'][ $shop_page_slug ] ) ) {
					$visible = true;
				}
			}
		}

		return $visible;
	}

	public function output_item() {
		$hook = current_filter();
		foreach ( $this->action_map[$hook] as $id ) {
			/* do_shortcode is applied via the themify_hooks_item_content filter */
			if( ! empty( $this->data["{$this->pre}-{$id}-code"] ) ) {
				echo apply_filters( 'themify_hooks_item_content', '<!-- hook content: ' . $hook . ' -->' . $this->data["{$this->pre}-{$id}-code"] . '<!-- /hook content: ' . $hook . ' -->', $this );
			}
		}
	}

	/**
	 * Returns a list of available hooks for the current theme.
	 *
	 * @return mixed
	 */
	public function get_locations() {
		return $this->hook_locations;
	}

	public function register_location( $id, $label, $group = 'layout' ) {
		$this->hook_locations[$group][$id] = $label;
	}

	public function unregister_location($id) {
		foreach ( $this->hook_locations as $group => $hooks ) {
			unset( $this->hook_locations[$group][$id] );
		}
	}

	public function get_location_groups() {
		return array(
			'layout' => __( 'Layout', 'themify' ),
			'general' => __( 'General', 'themify' ),
			'post' => __( 'Post', 'themify' ),
			'post_module' => __( 'Builder Post Module', 'themify' ),
			'comments' => __( 'Comments', 'themify' ),
			'ecommerce' => __( 'eCommerce', 'themify' ),
			'ptb' => __( 'Post Type Builder', 'themify' ),
		);
	}

	public function register_default_hook_locations() {
		foreach ( array(
					  array( 'wp_head', 'wp_head', 'general' ),
					  array( 'wp_footer', 'wp_footer', 'general' ),
					  array( 'themify_body_start', 'body_start', 'layout' ),
					  array( 'themify_header_before', 'header_before', 'layout' ),
					  array( 'themify_header_start', 'header_start', 'layout' ),
					  array( 'themify_header_end', 'header_end', 'layout' ),
					  array( 'themify_header_after', 'header_after', 'layout' ),
					  array( 'themify_mobile_menu_start', 'mobile_menu_start', 'layout' ),
					  array( 'themify_mobile_menu_end', 'mobile_menu_end', 'layout' ),
					  array( 'themify_layout_before', 'layout_before', 'layout' ),
					  array( 'themify_content_before', 'content_before', 'layout' ),
					  array( 'themify_content_start', 'content_start', 'layout' ),
					  array( 'themify_post_before', 'post_before', 'post' ),
					  array( 'themify_post_start', 'post_start', 'post' ),
					  array( 'themify_before_post_image', 'before_post_image', 'post' ),
					  array( 'themify_after_post_image', 'after_post_image', 'post' ),
					  array( 'themify_before_post_title', 'before_post_title', 'post' ),
					  array( 'themify_after_post_title', 'after_post_title', 'post' ),
					  array( 'themify_post_end', 'post_end', 'post' ),
					  array( 'themify_post_after', 'post_after', 'post' ),
					  array( 'themify_post_before_module', 'post_before', 'post_module' ),
					  array( 'themify_post_start_module', 'post_start', 'post_module' ),
					  array( 'themify_before_post_image_module', 'before_post_image', 'post_module' ),
					  array( 'themify_after_post_image_module', 'after_post_image', 'post_module' ),
					  array( 'themify_before_post_title_module', 'before_post_title', 'post_module' ),
					  array( 'themify_after_post_title_module', 'after_post_title', 'post_module' ),
					  array( 'themify_post_end_module', 'post_end', 'post_module' ),
					  array( 'themify_post_after_module', 'post_after', 'post_module' ),
					  array( 'themify_comment_before', 'comment_before', 'comments' ),
					  array( 'themify_comment_start', 'comment_start', 'comments' ),
					  array( 'themify_comment_end', 'comment_end', 'comments' ),
					  array( 'themify_comment_after', 'comment_after', 'comments' ),
					  array( 'themify_content_end', 'content_end', 'layout' ),
					  array( 'themify_content_after', 'content_after', 'layout' ),
					  array( 'themify_sidebar_before', 'sidebar_before', 'layout' ),
					  array( 'themify_sidebar_start', 'sidebar_start', 'layout' ),
					  array( 'themify_sidebar_end', 'sidebar_end', 'layout' ),
					  array( 'themify_sidebar_after', 'sidebar_after', 'layout' ),
					  array( 'themify_layout_after', 'layout_after', 'layout' ),
					  array( 'themify_footer_before', 'footer_before', 'layout' ),
					  array( 'themify_footer_start', 'footer_start', 'layout' ),
					  array( 'themify_footer_end', 'footer_end', 'layout' ),
					  array( 'themify_footer_after', 'footer_after', 'layout' ),
					  array( 'themify_body_end', 'body_end', 'layout' ),
				  ) as $key => $value ) {
			$this->register_location( $value[0], $value[1], $value[2] );
		}

		/* register ecommerce hooks group only if current theme supports WooCommerce */
		if ( themify_is_woocommerce_active() ) {
			foreach ( array(
				array( 'themify_product_image_start', 'product_image_start', 'ecommerce' ),
				array( 'themify_product_image_end', 'product_image_end', 'ecommerce' ),
				array( 'themify_product_title_start', 'product_title_start', 'ecommerce' ),
				array( 'themify_product_title_end', 'product_title_end', 'ecommerce' ),
				array( 'themify_product_price_start', 'product_price_start', 'ecommerce' ),
				array( 'themify_product_price_end', 'product_price_end', 'ecommerce' ),
				array( 'themify_checkout_start', 'checkout_start', 'ecommerce' ),
				array( 'themify_checkout_end', 'checkout_end', 'ecommerce' ),
				array( 'themify_ecommerce_sidebar_before', 'ecommerce_sidebar_before', 'ecommerce' ),
				array( 'themify_ecommerce_sidebar_after', 'ecommerce_sidebar_after', 'ecommerce' ),
			) as $key => $value ) {
				$this->register_location( $value[0], $value[1], $value[2] );
			}
		}

		/* register hook locations for PTB plugin */
		if ( class_exists( 'PTB' ) ) {
			foreach ( array(
				array( 'ptb_before_author', 'before_author', 'ptb' ),
				array( 'ptb_after_author', 'after_author', 'ptb' ),
				array( 'ptb_before_category', 'before_category', 'ptb' ),
				array( 'ptb_after_category', 'after_category', 'ptb' ),
				array( 'ptb_before_comment_count', 'before_comment_count', 'ptb' ),
				array( 'ptb_after_comment_count', 'after_comment_count', 'ptb' ),
				array( 'ptb_before_comments', 'before_comments', 'ptb' ),
				array( 'ptb_after_comments', 'after_comments', 'ptb' ),
				array( 'ptb_before_custom_image', 'before_custom_image', 'ptb' ),
				array( 'ptb_after_custom_image', 'after_custom_image', 'ptb' ),
				array( 'ptb_before_custom_text', 'before_custom_text', 'ptb' ),
				array( 'ptb_after_custom_text', 'after_custom_text', 'ptb' ),
				array( 'ptb_before_date', 'before_date', 'ptb' ),
				array( 'ptb_after_date', 'after_date', 'ptb' ),
				array( 'ptb_before_editor', 'before_content', 'ptb' ),
				array( 'ptb_after_editor', 'after_content', 'ptb' ),
				array( 'ptb_before_excerpt', 'before_excerpt', 'ptb' ),
				array( 'ptb_after_excerpt', 'after_excerpt', 'ptb' ),
				array( 'ptb_before_permalink', 'before_permalink', 'ptb' ),
				array( 'ptb_after_permalink', 'after_permalink', 'ptb' ),
				array( 'ptb_before_post_tag', 'before_post_tag', 'ptb' ),
				array( 'ptb_after_post_tag', 'after_post_tag', 'ptb' ),
				array( 'ptb_before_taxonomies', 'before_taxonomies', 'ptb' ),
				array( 'ptb_after_taxonomies', 'after_taxonomies', 'ptb' ),
				array( 'ptb_before_thumbnail', 'before_thumbnail', 'ptb' ),
				array( 'ptb_after_thumbnail', 'after_thumbnail', 'ptb' ),
				array( 'ptb_before_title', 'before_title', 'ptb' ),
				array( 'ptb_after_title', 'after_title', 'ptb' ),
			) as $key => $value ) {
				$this->register_location( $value[0], $value[1], $value[2] );
			}
		}
	}

	function config_setup($themify_theme_config) {
		$themify_theme_config['panel']['settings']['tab']['hook-content'] = array(
			'title' => __( 'Hook Content', 'themify' ),
			'id' => 'hooks',
			'custom-module' => array(
				array(
					'title' => __( 'Hook Content', 'themify' ),
					'function' => array( $this, 'config_view' ),
				),
			)
		);

		return $themify_theme_config;
	}

	function config_view($data = array()) {
		$data = themify_get_data();
		$field_ids_json = isset( $data["{$this->pre}_field_ids"] ) ? $data["{$this->pre}_field_ids"] : '';
		$field_ids = json_decode( $field_ids_json );
		if ( ! is_array( $field_ids ) ) {
			$field_ids = array();
		}

		$out = '<div class="themify-info-link">' . sprintf( __( 'Use <a href="%s" target="_blank">Hook Content</a> to add content to the theme without editing any template file.', 'themify' ), 'https://themify.me/docs/hook-content' ) . '</div>';

		$out .= '<ul id="hook-content-list">';
		if ( ! empty( $field_ids ) ) : foreach ( $field_ids as $value ) :
				$out .= $this->item_template( $value );
			endforeach;
		endif;
		$out .= '</ul>';
		$out .= '<p class="add-link themify-add-hook alignleft"><a href="#">' . __( 'Add item', 'themify' ) . '</a></p>';
		$out .= '<input type="hidden" id="themify-hooks-field-ids" name="' .  $this->pre . '_field_ids" value=\'' . json_encode( $field_ids ) . '\' />';
		return $out;
	}

	function ajax_add_button() {
		check_ajax_referer( 'ajax-nonce', 'nonce' );
		if( ! current_user_can( 'manage_options' ) ) {
			die;
		}

		if ( isset( $_POST['field_id'] ) ) {
			echo $this->item_template( $_POST['field_id'] );
		}

		die;
	}

	function item_template( $id ) {
		$output = '<li class="social-link-item" data-id="' . $id . '">';
		$output .= '<div class="social-drag">' . esc_html__( 'Drag to Sort', 'themify' ) . '<i class="ti-arrows-vertical"></i></div>';
		$output .= '<div class="row"><select name="' .  $this->pre . '-' . $id . '-location" class="width7">';
		$locations = $this->get_locations();
		$current=themify_get( "{$this->pre}-{$id}-location",false,true );
		foreach ( $this->get_location_groups() as $group => $label ) {
			if ( ! empty( $locations[$group] ) ) {
				$output .= '<optgroup label="' . esc_attr( $label ) . '">';
				foreach ( $locations[$group] as $key => $value ) {
					$output .= '<option value="' . $key . '" ' . selected( $current, $key, false ) . '>' . esc_html( $value ) . '</option>';
				}
				$output .= '</optgroup>';
			}
		}
		$output .= '</select>';
		//Backward compatibility
		$selected = array();
		$value = themify_get( $this->pre . '-' . $id . '-visibility',false,true );
		parse_str( $value, $selected );
		if(!empty($selected['tax']) && !empty($selected['tax']['category_single'])){
			reset($selected['tax']['category_single']);
			$first_key = key($selected['tax']['category_single']);
			if(!is_array($selected['tax']['category_single'][$first_key])){
				$values = explode('&',$value);
				foreach ($values as $k=>$i){
					if(0 === strpos($i,'tax%5Bcategory_single%5D')){
						unset($values[$k]);
					}
				}
				foreach ($selected['tax']['category_single'] as $k=>$v){
					$values[] = urlencode("tax[category_single][category][$k]").'=on';
				}
				$value = implode('&',$values);
			}
		}

		$output .= '<a class="button button-secondary see-hook-locations themify_link_btn" href="' . add_query_arg(array( 'tp' => 1), home_url()) . '">' . __( 'Select Hook Locations', 'themify' ) . '</a>';

		$output .= '&nbsp; <a class="button button-secondary themify-visibility-toggle" href="#" data-target="#' . $this->pre . '-' . $id . '-visibility" data-item="' . $id . '" data-text="' . __( '+ Display Conditions', 'themify' ) . '"> ' . __( '+ Display Conditions', 'themify' ) . ' </a> <input type="hidden" id="' . $this->pre . '-' . $id . '-visibility" name="' . $this->pre . '-' . $id . '-visibility" value="' . esc_attr( $value ) . '" /></div>';
		$output .= '<div class="row"><textarea class="widthfull" name="' . $this->pre . '-' . $id . '-code" rows="6" cols="73">' . esc_html( themify_get( "{$this->pre}-{$id}-code",false,true ) ) . '</textarea>';
		$output .= '<a href="#" class="remove-item"><i class="tf_close"></i></a>';
		$output .= '</li>';
		return $output;
	}

	public function get_visibility_dialog() {
		$output = '
			<div class="themify_lightbox_visibility themify-admin-lightbox themify-admin-lightbox-1 tf_clearfix" style="display: none;" data-item="1">
				<h3 class="themify_lightbox_title">' . __( 'Condition', 'themify' ) . '</h3>
				<a href="#" class="close_lightbox"><i class="tf_close"></i></a>
				<div class="lightbox_container">
				</div>
				<p class="themify_lightbox_uncheck_container"><a href="#" class="uncheck-all" data-unchecked-text="' . __( 'Uncheck All', 'themify' ) . '" data-checked-text="' . __( 'Show checked', 'themify' ) . '">' . __( 'Uncheck All', 'themify' ) . '</a></p>
				<a href="#" class="button button-primary visibility-save alignright">' . __( 'Save', 'themify' ) . '</a>
			</div>
			<div id="themify_lightbox_overlay"></div>
		';

		return $output;
	}

	public function visibility_dialog() {
		global $hook_suffix;

		if ( 'toplevel_page_themify' === $hook_suffix ) {
			echo $this->get_visibility_dialog();
		}
	}

	function exclude_attachments_from_visibility( $post_types ) {
		unset( $post_types['attachment'] );
		return $post_types;
	}

	function ajax_create_inner_page() {
		check_ajax_referer( 'ajax-nonce', 'nonce' );
		if( ! current_user_can( 'manage_options' )) {
			die;
		}
		$selected = array();
		if ( isset( $_POST['selected'] ) ) {
			parse_str( $_POST['selected'], $selected );
		}
		$type= isset( $_POST['type'] ) ? $_POST['type'] : 'pages';
		echo $this->create_inner_page($type, $selected);
		die;
	}

	/**
	 * Renders pages, posts types and categories items based on current page.
	 *
	 * @param string $type The type of items to render.
	 * @param array $selected The array of all selected options.
	 *
	 * @return array The HTML to render items as HTML.
	 */
	function create_inner_page( $type, $selected ) {
		$posts_per_page = 24;
		$output = '';
		$new_checked = array();
		switch ($type) {
			case 'page':
		$key            = 'page';
		$posts          = new WP_Query( array(
			'post_type'              => $key,
			'posts_per_page'         => -1,
			'paged'                  => 1,
			'ignore_sticky_posts'=>true,
			'status'                 => 'published',
			'orderby'                => 'title',
			'order'                  => 'ASC',
			'no_found_rows'          => true,
			'cache_results'          => false,
			'update_post_term_cache' => false,
			'update_post_meta_cache' => false,
		) );
		if ( ! empty( $posts ) ) {
					$i = 1;
					$page_id = 1;
					$num_of_single_pages = count($posts->posts);
					$num_of_pages = (int) ceil( $num_of_single_pages / $posts_per_page );
					$output .= '<div class="themify-visibility-items-inner" data-items="' . $num_of_single_pages . '" data-pages="' . $num_of_pages . '">';
					$output .= '<div class="themify-visibility-items-page themify-visibility-items-page-' . $page_id . '">';
			foreach ( $posts->posts as $post ) :
				$post->post_name = $this->child_post_name($post);
				if ( $post->post_parent > 0 ) {
					$post->post_name = '/' . $post->post_name . '/';
				}
				$checked = isset( $selected['post_type'][ $type ][ $post->post_name ] ) ? checked( $selected['post_type'][ $type ][ $post->post_name ], 'on', false ) : '';
				if(!empty($checked)){
					$new_checked[] = urlencode("post_type[$type][$post->post_name]").'=on';
				}
				/* note: slugs are more reliable than IDs, they stay unique after export/import */
						$output .= '<label><input type="checkbox" name="' . esc_attr( 'post_type[' . $type . '][' . $post->post_name . ']' ) . '" ' . $checked . ' /><span data-tooltip="'.get_permalink($post).'">' . esc_html( $post->post_title ) . '</span></label>';
						if ( $i === ($page_id * $posts_per_page) ) {
							$output .= '</div>';
							$page_id++;
							$output .= '<div class="themify-visibility-items-page themify-visibility-items-page-' . $page_id . ' is-hidden">';
						}
						$i++;
					endforeach;
					$output .= '</div>';
					if ( $num_of_pages > 1 ) {
						$output .= '<div class="themify-visibility-pagination">';
						$output .= $this->create_page_pagination( 1, $num_of_pages );
						$output .= '</div>';
					}
					$output .= '</div>';
				}
				break;

			case 'category_single':
				$m_key = 'category_single';
				$taxonomies = get_taxonomies( array( 'public' => true ) );

				if ( ! empty( $taxonomies ) ) {
					$post_id = 1;
					foreach ( $taxonomies  as $key => $tax) {
						$terms = get_terms( $key, array( 'hide_empty' => true ) );
						$output .= '<div id="visibility-tab-' . $key . '" class="themify-visibility-inner-tab '. ($post_id > 1 ? 'is-hidden' : '') .'">';
						if ( ! empty( $terms ) ) {
							$i                   = 1;
							$page_id             = 1;
							$num_of_single_pages = count( $terms );
							$num_of_pages        = (int) ceil( $num_of_single_pages / $posts_per_page );
							$output              .= '<div class="themify-visibility-items-inner" data-items="' . $num_of_single_pages . '" data-pages="' . $num_of_pages . '">';
							$output              .= '<div class="themify-visibility-items-page themify-visibility-items-page-' . $page_id . '">';
							foreach ( $terms as $term ) :
								$checked = isset( $selected['tax'][$m_key][$key][ $term->slug ] ) ? checked( $selected['tax'][$m_key][$key][ $term->slug ], 'on', false ) : '';
								if(!empty($checked)){
									$new_checked[] = urlencode("tax[$m_key][$key][$term->slug]").'=on';
								}
								$output  .= '<label><input type="checkbox" name="tax[' . $m_key . '][' . $key . '][' . $term->slug . ']" ' . $checked . ' /><span data-tooltip="'.get_term_link($term).'">' . $term->name . '</span></label>';
								if ( $i === ( $page_id * $posts_per_page ) ) {
									$output .= '</div>';
									$page_id ++;
									$output .= '<div class="themify-visibility-items-page themify-visibility-items-page-' . $page_id . ' is-hidden">';
								}
								++$i;
							endforeach;
							$output .= '</div>';
							if ( $num_of_pages > 1 ) {
								$output .= '<div class="themify-visibility-pagination">';
								$output .= $this->create_page_pagination( 1, $num_of_pages );
								$output .= '</div>';
							}
							$output .= '</div>';
						}
						$output .= '</div></div></div>';
						++$post_id;
					}
					$output .= '</div>';
				}
				break;

			case 'category':
				$key = 'category';
				$terms = get_terms( 'category', array( 'hide_empty' => true ) );
				if ( ! empty( $terms ) ) {
					$i                   = 1;
					$page_id             = 1;
					$num_of_single_pages = count( $terms );
					$num_of_pages        = (int) ceil( $num_of_single_pages / $posts_per_page );
					$output              .= '<div class="themify-visibility-items-inner" data-items="' . $num_of_single_pages . '" data-pages="' . $num_of_pages . '">';
					$output              .= '<div class="themify-visibility-items-page themify-visibility-items-page-' . $page_id . '">';
					foreach ( $terms as $term ) :
						$checked = isset( $selected['tax'][$key][$term->slug] ) ? checked( $selected['tax'][$key][$term->slug], 'on', false ) : '';
						if(!empty($checked)){
							$new_checked[] = urlencode("tax[$key][$term->slug]").'=on';
						}
					$output .= '<label><input type="checkbox" name="' . esc_attr( 'tax[' . $key . '][' . $term->slug . ']' ) . '" ' . $checked . ' /><span data-tooltip="'.get_term_link($term).'">' . esc_html( $term->name ) . '</span></label>';
						if ( $i === ( $page_id * $posts_per_page ) ) {
							$output .= '</div>';
							$page_id ++;
							$output .= '<div class="themify-visibility-items-page themify-visibility-items-page-' . $page_id . ' is-hidden">';
						}
						$i++;
			endforeach;
					$output .= '</div>';
					if ( $num_of_pages > 1 ) {
						$output .= '<div class="themify-visibility-pagination">';
						$output .= $this->create_page_pagination( 1, $num_of_pages );
						$output .= '</div>';
			}
					$output .= '</div>';
				}
				break;

			default :
				$post_types = apply_filters( 'themify_hooks_visibility_post_types', get_post_types( array( 'public' => true ) ) );
				unset( $post_types['page'] );
				$post_types = array_map( 'get_post_type_object', $post_types );
				$post_id = 1;
				foreach ( $post_types as $key => $post_type ) {
					$output .= '<div id="visibility-tab-' . $key . '" class="themify-visibility-inner-tab '. ($post_id > 1 ? 'is-hidden' : '') .'">';
				$posts = get_posts( array(
					'post_type' => $key,
					'posts_per_page' => -1,
					'status' => 'published',
					'orderby' => 'title',
					'order' => 'ASC',
					'no_found_rows'=>true,
					'ignore_sticky_posts'=>true,
					'cache_results'=>false,
					'update_post_term_cache'=>false,
					'update_post_meta_cache'=>false
				) );
				if ( ! empty( $posts ) ) {
						$i                   = 1;
						$page_id             = 1;
						$num_of_single_pages = count( $posts );
						$num_of_pages        = (int) ceil( $num_of_single_pages / $posts_per_page );
						$output              .= '<div class="themify-visibility-items-inner" data-items="' . $posts_per_page . '" data-pages="' . $num_of_pages . '">';
						$output              .= '<div class="themify-visibility-items-page themify-visibility-items-page-' . $page_id . '">';
					foreach ( $posts as $post ) :
						$post->post_name = $this->child_post_name($post);
						if ( $post->post_parent > 0 ) {
							$post->post_name = '/' . $post->post_name . '/';
						}
						$checked = isset( $selected['post_type'][ $key ][ $post->post_name ] ) ? checked( $selected['post_type'][ $key ][ $post->post_name ], 'on', false ) : '';
						if(!empty($checked)){
							$new_checked[] = urlencode("post_type[$key][$post->post_name]").'=on';
						}
						/* note: slugs are more reliable than IDs, they stay unique after export/import */
							$output .= '<label><input type="checkbox" name="' . esc_attr( 'post_type[' . $key . '][' . $post->post_name . ']' ) . '" ' . $checked . ' /><span data-tooltip="'.get_permalink($post->ID).'">' . esc_html( $post->post_title ) . '</span></label>';
							if ( $i === ( $page_id * $posts_per_page ) ) {
								$output .= '</div>';
								$page_id ++;
								$output .= '<div class="themify-visibility-items-page themify-visibility-items-page-' . $page_id . ' is-hidden">';
							}
							$i++;
					endforeach;
						$output .= '</div>';
						if ( $num_of_pages > 1 ) {
							$output .= '<div class="themify-visibility-pagination">';
							$output .= $this->create_page_pagination( 1, $num_of_pages );
							$output .= '</div>';
					}
				}
					$output .= '</div></div></div>';
					$post_id++;
				}
				$output .= '</div>';
				break;
		}
		wp_reset_postdata();

		// Update original values
		$values = explode('&',$_POST['original_values']);
		if(!empty($values) && is_array($values)){
			$values = array_diff($values,$new_checked);
		}
		$values = empty($values) ? '' : implode('&',$values);
		$result = json_encode(array('original_values'=>$values,'html'=>$output));
		return $result;
	}

	function ajax_create_page_pagination() {
		check_ajax_referer( 'ajax-nonce', 'nonce' );
		if( ! current_user_can( 'manage_options' )) {
			die;
		}
		$current_page = isset( $_POST['current_page'] ) ? $_POST['current_page'] : 1;
		$num_of_pages = isset( $_POST['num_of_pages'] ) ? $_POST['num_of_pages'] : 0;
		echo $this->create_page_pagination($current_page, $num_of_pages);
		die;
	}

	/**
	 * Render pagination for specific page.
	 *
	 * @param Integer $current_page The current page that needs to be rendered.
	 * @param Integer $num_of_pages The number of all pages.
	 *
	 * @return String The HTML with pagination.
	 */
	function create_page_pagination( $current_page, $num_of_pages ) {
		$links_in_the_middle = 4;
		$links_in_the_middle_min_1 = $links_in_the_middle - 1;
		$first_link_in_the_middle   = $current_page - floor( $links_in_the_middle_min_1 / 2 );
		$last_link_in_the_middle    = $current_page + ceil( $links_in_the_middle_min_1 / 2 );
		if ( $first_link_in_the_middle <= 0 ) {
			$first_link_in_the_middle = 1;
		}
		if ( ( $last_link_in_the_middle - $first_link_in_the_middle ) != $links_in_the_middle_min_1 ) {
			$last_link_in_the_middle = $first_link_in_the_middle + $links_in_the_middle_min_1;
		}
		if ( $last_link_in_the_middle > $num_of_pages ) {
			$first_link_in_the_middle = $num_of_pages - $links_in_the_middle_min_1;
			$last_link_in_the_middle  = (int) $num_of_pages;
		}
		if ( $first_link_in_the_middle <= 0 ) {
			$first_link_in_the_middle = 1;
		}
		$pagination = '';
		if ( $current_page != 1 ) {
			$pagination .= '<a href="/page/' . ( $current_page - 1 ) . '" class="prev page-numbers ti-angle-left"/>';
		}
		if ( $first_link_in_the_middle >= 3 && $links_in_the_middle < $num_of_pages ) {
			$pagination .= '<a href="/page/" class="page-numbers">1</a>';

			if ( $first_link_in_the_middle != 2 ) {
				$pagination .= '<span class="page-numbers extend">...</span>';
			}
		}
		for ( $i = $first_link_in_the_middle; $i <= $last_link_in_the_middle; $i ++ ) {
			if ( $i == $current_page ) {
				$pagination .= '<span class="page-numbers current">' . $i . '</span>';
			} else {
				$pagination .= '<a href="/page/' . $i . '" class="page-numbers">' . $i . '</a>';
			}
		}
		if ( $last_link_in_the_middle < $num_of_pages ) {
			if ( $last_link_in_the_middle != ( $num_of_pages - 1 ) ) {
				$pagination .= '<span class="page-numbers extend">...</span>';
			}
			$pagination .= '<a href="/page/' . $num_of_pages . '" class="page-numbers">' . $num_of_pages . '</a>';
		}
		if ( $current_page != $last_link_in_the_middle ) {
			$pagination .= '<a href="/page/' . ( $current_page + $i ) . '" class="next page-numbers ti-angle-right"></a>';
		}

		return $pagination;
	}

	function ajax_get_visibility_options() {
		check_ajax_referer( 'ajax-nonce', 'nonce' );
		if( ! current_user_can( 'manage_options' ) ) {
			die;
		}

		$selected = array();
		if ( isset( $_POST['selected'] ) ) {
			parse_str( $_POST['selected'], $selected );
		}
		echo $this->get_visibility_options( $selected );
		die;
	}

	public function get_visibility_options($selected = array()) {
		$post_types = apply_filters( 'themify_hooks_visibility_post_types', get_post_types( array( 'public' => true ) ) );
		unset( $post_types['page'] );
		$post_types = array_map( 'get_post_type_object', $post_types );

		$taxonomies = apply_filters( 'themofy_hooks_visibility_taxonomies', get_taxonomies( array( 'public' => true ) ) );
		unset( $taxonomies['category'] );
		$taxonomies = array_map( 'get_taxonomy', $taxonomies );

		$output = '<form id="visibility-tabs" class="ui-tabs"><ul class="tf_clearfix">';

		/* build the tab links */
		$output .= '<li><a href="#visibility-tab-general">' . __( 'General', 'themify' ) . '</a></li>';
		$output .= '<li><a href="#visibility-tab-pages" class="themify-visibility-tab" data-type="page">' . __( 'Pages', 'themify' ) . '</a></li>';
		$output .= '<li><a href="#visibility-tab-categories-singles" class="themify-visibility-tab" data-type="category_single">' . __( 'In Categories', 'themify' ) . '</a></li>';
		$output .= '<li><a href="#visibility-tab-categories" class="themify-visibility-tab" data-type="category">' . __( 'Categories', 'themify' ) . '</a></li>';
		$output .= '<li><a href="#visibility-tab-post-types" class="themify-visibility-tab" data-type="post">' . __( 'Post Types', 'themify' ) . '</a></li>';
		$output .= '<li><a href="#visibility-tab-taxonomies">' . __( 'Taxonomies', 'themify' ) . '</a></li>';
		$output .= '<li><a href="#visibility-tab-userroles">' . __( 'User Roles', 'themify' ) . '</a></li>';
		$output .= '</ul>';

		/* build the tab items */
		$output .= '<div id="visibility-tab-general" class="themify-visibility-options tf_clearfix">';
		$checked = isset($selected['general']['home']) ? checked($selected['general']['home'], 'on', false) : '';
		$output .= '<label><input type="checkbox" name="general[home]" ' . $checked . ' /><span data-tooltip="'.get_home_url().'">' . __( 'Home page', 'themify' ) . '</span></label>';
		$checked = isset($selected['general']['page']) ? checked($selected['general']['page'], 'on', false) : '';
		$output .= '<label><input type="checkbox" name="general[page]" ' . $checked . ' />' . __( 'Page views', 'themify' ) . '</label>';
		$checked = isset($selected['general']['single']) ? checked($selected['general']['single'], 'on', false) : '';
		$output .= '<label><input type="checkbox" name="general[single]" ' . $checked . ' />' . __( 'Single post views', 'themify' ) . '</label>';
		$checked = isset($selected['general']['search']) ? checked($selected['general']['search'], 'on', false) : '';
		$output .= '<label><input type="checkbox" name="general[search]" ' . $checked . ' />' . __( 'Search pages', 'themify' ) . '</label>';
		$checked = isset($selected['general']['category']) ? checked($selected['general']['category'], 'on', false) : '';
		$output .= '<label><input type="checkbox" name="general[category]" ' . $checked . ' />' . __( 'Category archive', 'themify' ) . '</label>';
		$checked = isset($selected['general']['tag']) ? checked($selected['general']['tag'], 'on', false) : '';
		$output .= '<label><input type="checkbox" name="general[tag]" ' . $checked . ' />' . __( 'Tag archive', 'themify' ) . '</label>';
		$checked = isset($selected['general']['author']) ? checked($selected['general']['author'], 'on', false) : '';
		$output .= '<label><input type="checkbox" name="general[author]" ' . $checked . ' />' . __( 'Author pages', 'themify' ) . '</label>';
		$checked = isset($selected['general']['date']) ? checked($selected['general']['date'], 'on', false) : '';
		$output .= '<label><input type="checkbox" name="general[date]" ' . $checked . ' />' . __( 'Date archive pages', 'themify' ) . '</label>';
		$checked = isset($selected['general']['year']) ? checked($selected['general']['year'], 'on', false) : '';
		$output .= '<label><input type="checkbox" name="general[year]" ' . $checked . ' />' . __( 'Year based archive', 'themify' ) . '</label>';
		$checked = isset($selected['general']['month']) ? checked($selected['general']['month'], 'on', false) : '';
		$output .= '<label><input type="checkbox" name="general[month]" ' . $checked . ' />' . __( 'Month based archive', 'themify' ) . '</label>';
		$checked = isset($selected['general']['day']) ? checked($selected['general']['day'], 'on', false) : '';
		$output .= '<label><input type="checkbox" name="general[day]" ' . $checked . ' />' . __( 'Day based archive', 'themify' ) . '</label>';
		$checked = isset( $selected['general']['logged'] ) ? checked( $selected['general']['logged'], 'on', false ) : '';
		$output .= '<label><input type="checkbox" name="general[logged]" '. $checked .' />' . __( 'User logged in', 'themify' ) . '</label>';

		/* CPT Single View */
		foreach ( get_post_types( array( 'public' => true, 'exclude_from_search' => false, '_builtin' => false ) ) as $key => $post_type ) {
			$post_type = get_post_type_object( $key );
			$checked = isset( $selected['general'][$key] ) ? checked( $selected['general'][$key], 'on', false ) : '';
			$output .= '<label><input type="checkbox" name="' . esc_attr('general[' . $key . ']' ) . '" ' . $checked . ' />' . sprintf( __( 'Single %s View', 'themify' ), $post_type->labels->singular_name ) . '</label>';
		}

		/* CPT Archive View*/
		foreach ( get_post_types( array( 'public' => true, 'exclude_from_search' => false, '_builtin' => false, 'has_archive' => true ) ) as $key => $post_type ) {
			$post_type = get_post_type_object( $key );
			$checked = isset( $selected['post_type_archive'][$key] ) ? checked( $selected['post_type_archive'][$key], 'on', false ) : '';
			$output .= '<label><input type="checkbox" name="' . esc_attr('post_type_archive[' . $key . ']' ) . '" ' . $checked . ' />' . sprintf( __( '%s Archive View', 'themify' ), $post_type->labels->singular_name ) . '</label>';
		}

		/* Custom taxonomies archive view */
		foreach ( get_taxonomies( array( 'public' => true, '_builtin' => false ) ) as $key => $tax ) {
			$tax = get_taxonomy( $key );
			$checked = isset( $selected['general'][$key] ) ? checked( $selected['general'][$key], 'on', false ) : '';
			$output .= '<label><input type="checkbox" name="' . esc_attr( 'general[' . $key . ']' ) . '" ' . $checked . ' />' . sprintf( __( '%s Archive View', 'themify' ), $tax->labels->singular_name ) . '</label>';
		}

		$output .= '</div>'; // tab-general
		// Pages tab
		wp_reset_postdata();
		$output .= '<div id="visibility-tab-pages" class="themify-visibility-options themify-visibility-type-options tf_clearfix tf_scrollbar" data-type="page">';
		$output .= '</div>'; // tab-pages
		// Category Singles tab
		$output .= '<div id="visibility-tab-categories-singles" class="themify-visibility-options tf_clearfix" data-type="category_single">';
		$output .= '<div id="themify-visibility-category-single-inner-tabs" class="themify-visibility-inner-tabs tf_scrollbar">';
		$output .= '<ul class="inline-tabs tf_clearfix">';
		foreach( $taxonomies as $key => $tax ) {
			$output .= '<li><a href="#visibility-tab-' . $key . '">' . $tax->label . '</a></li>';
		}
		$output .= '</ul>';
		$output .= '<div class="themify-visibility-type-options tf_clearfix" data-type="category_single"></div>';
		$output .= '</div>';
		$output .= '</div>';
		// Categories tab
		$output .= '<div id="visibility-tab-categories" class="themify-visibility-options themify-visibility-type-options tf_clearfix" data-type="category">';
		$output .= '</div>'; // tab-categories
		// Post types tab
		$output .= '<div id="visibility-tab-post-types" class="themify-visibility-options tf_clearfix" data-type="post">';
		$output .= '<div id="themify-visibility-post-types-inner-tabs" class="themify-visibility-inner-tabs tf_scrollbar">';
		$output .= '<ul class="inline-tabs tf_clearfix">';
		foreach ( $post_types as $key => $post_type ) {
			$output .= '<li><a href="#visibility-tab-' . $key . '">' . esc_html( $post_type->label ) . '</a></li>';
		}
		$output .= '</ul>';
		$output .= '<div class="themify-visibility-type-options tf_clearfix" data-type="post"></div>';
		$output .= '</div>';
		$output .= '</div>'; // tab-post-types
		// Taxonomies tab
		$output .= '<div id="visibility-tab-taxonomies" class="themify-visibility-options tf_clearfix">';
		$output .= '<div id="themify-visibility-taxonomies-inner-tabs" class="themify-visibility-inner-tabs">';
		$output .= '<ul class="inline-tabs tf_clearfix">';
		foreach ( $taxonomies as $key => $tax ) {
			$output .= '<li><a href="#visibility-tab-' . $key . '">' . esc_html($tax->label) . '</a></li>';
		}
		$output .= '</ul>';
		foreach ( $taxonomies as $key => $tax ) {
			$output .= '<div id="visibility-tab-' . $key . '" class="tf_clearfix">';
			$terms = get_terms( $key, array( 'hide_empty' => true ) );
			if ( ! empty( $terms ) ) : foreach ( $terms as $term ) :
					$checked = isset( $selected['tax'][$key][$term->slug] ) ? checked( $selected['tax'][$key][$term->slug], 'on', false ) : '';
				if(!empty($checked)){
					$new_checked[] = urlencode("tax[$key][$term->slug]").'=on';
				}
					$output .= '<label><input type="checkbox" name="' . esc_attr( 'tax[' . $key . '][' . $term->slug . ']' ) . '" ' . $checked . ' /><span data-tooltip="'.get_term_link($term).'">' . esc_html( $term->name ) . '</span></label>';
				endforeach;
			endif;
			$output .= '</div>';
		}
		$output .= '</div>';
		$output .= '</div>'; // tab-taxonomies
		// User Roles tab
		$output .= '<div id="visibility-tab-userroles" class="themify-visibility-options tf_clearfix">';
		foreach ( $GLOBALS['wp_roles']->roles as $key => $role ) {
			$checked = isset( $selected['roles'][$key] ) ? checked( $selected['roles'][$key], 'on', false ) : '';
			$output .= '<label><input type="checkbox" name="' . esc_attr( 'roles[' . $key . ']' ) . '" ' . $checked . ' />' . esc_html( $role['name'] ) . '</label>';
		}
		$output .= '</div>'; // tab-userroles

		$output .= '</form>';
		// keep original values
		$values = explode('&',$_POST['selected']);
		if(!empty($values) && is_array($values)){
			foreach ($values as $k=>$val){
				if(0 === strpos($val,'general') || 0 === strpos($val,'tax%5Bpost_tag%5D') || 0 === strpos($val,'roles')){
					unset($values[$k]);
				}
			}
			$values = implode('&',$values);
		}else{
			$values = '';
		}
		$output .= '<input type="hidden" id="themify-original-conditions" value="'.$values.'"/>';
		return $output;
	}

	function hook_locations_view_setup() {
		if ( isset( $_GET['tp'] ) && $_GET['tp'] == 1 ) {
			show_admin_bar( false );

			add_action( 'wp_head', array( __CLASS__, 'wp_head' ) );

			/* enqueue url fix script */
			wp_enqueue_script('hook-locations-urlfix', themify_enque(THEMIFY_URI . '/js/admin/hook-locations-urlfix.js'), array( 'jquery' ), THEMIFY_VERSION, false);

			foreach ( $this->get_locations() as $group_key => $group_items ) {
				if ( $group_key === 'general' ) {
					continue;
				}
				foreach ( $group_items as $location => $label ) {
					add_action( $location, array( $this, 'print_hook_label' ) );
				}
			}
		}
	}

	public static function wp_head() {
		?>
		<style>
		.hook-location-hint {
			padding: 7px 15px;
			background: #fbffcd;
			border: solid 1px #cfd682;
			color: #666;
			font-size: 11px;
			line-height: 1;
			margin: 2px 0;
			display: block;
			clear: both;
			cursor: pointer;
		}
		.hook-location-hint:hover {
			    outline: 2px solid #860000;
				background: #eaf1a5;
		}
		</style>
		<?php
	}

	function print_hook_label() {
		$hook = current_filter();
		echo '<div class="hook-location-hint" data-id="' . esc_attr( $hook ) . '">' . esc_html( preg_replace( '/^themify_/', '', $hook ) ) . '</div>';
	}

	private function child_post_name($post) {
		$str = $post->post_name;

		if ( $post->post_parent > 0 ) {
			$parent = get_post($post->post_parent);
			$parent->post_name = $this->child_post_name($parent);
			$str = $parent->post_name . '/' . $str;
		}

		return $str;
	}
	
	

	/**
	 * Run shortcode with same functionality as WP prior to 4.2.3 update and
	 * this ticket: https://core.trac.wordpress.org/ticket/15694
	 * Similar to do_shortcode, however will not encode html entities
	 *
	 * @return string
	 */
	function themify_do_shortcode_wp( $content ) {
		global $shortcode_tags;

		if ( false === strpos( $content, '[' ) || empty($shortcode_tags) || !is_array($shortcode_tags)) {
			return $content;
		}
		// Find all registered tag names in $content.
		preg_match_all( '@\[([^<>&/\[\]\x00-\x20=]++)@', $content, $matches );
		$tagnames = array_intersect( array_keys( $shortcode_tags ), $matches[1] );

		if ( empty( $tagnames ) ) {
			return $content;
		}

		$pattern = get_shortcode_regex( $tagnames );
		$content = preg_replace_callback( "/$pattern/", 'do_shortcode_tag', $content );

		// Always restore square braces so we don't break things like <!--[if IE ]>
		$content = unescape_invalid_shortcodes( $content );

		return $content;
	}

}